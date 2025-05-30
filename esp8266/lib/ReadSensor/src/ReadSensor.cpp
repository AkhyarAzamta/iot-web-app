// Sensor.cpp
#include "ReadSensor.h"
#include <Arduino.h>
#include "Config.h"


// Existing sensor read implementations
#define SCOUNT          30
#define VREF            3.3f
#define BASELINE_OFFSET 4.3f
static int buf[SCOUNT];
static uint8_t bufIndex = 0;
const float voltage7 = 1.86f, voltage4 = 2.10f;
static const int nCalibSamples = 50;
static const float Vmin = 0.50f;
static float Vmax = 3.30f;

// Static storage definitions
SensorSetting Sensor::settings[MAX_SENSOR_SETTINGS];
uint8_t       Sensor::settingCount   = 0;
uint16_t      Sensor::nextSettingId  = 1;

// Internal: load & save helpers
void Sensor::loadAllSettings() {
    if (!LittleFS.begin()) return;
    if (!LittleFS.exists(SENSOR_SETTINGS_FILE)) {
        settingCount = 0;
        nextSettingId = 1;
        return;
    }
    File f = LittleFS.open(SENSOR_SETTINGS_FILE, "r");
    if (!f) return;
    uint8_t cnt = f.read();
    if (cnt > MAX_SENSOR_SETTINGS) cnt = 0;
    settingCount = cnt;
    for (uint8_t i = 0; i < settingCount; i++) {
        f.read((uint8_t*)&settings[i], sizeof(SensorSetting));
    }
    f.close();
    nextSettingId = 1;
    for (uint8_t i = 0; i < settingCount; i++) {
        nextSettingId = max(nextSettingId, uint16_t(settings[i].id + 1));
    }
}

void Sensor::saveAllSettings() {
    if (!LittleFS.begin()) return;
    File f = LittleFS.open(SENSOR_SETTINGS_FILE, "w");
    if (!f) return;
    f.write(settingCount);
    for (uint8_t i = 0; i < settingCount; i++) {
        f.write((uint8_t*)&settings[i], sizeof(SensorSetting));
    }
    f.close();
}

// Public API: CRUD persistence
SensorSetting* Sensor::getAllSettings(uint8_t &outCount) {
    loadAllSettings();
    outCount = settingCount;
    return settings;
}

bool Sensor::addSetting(const SensorSetting &s) {
    loadAllSettings();
    if (settingCount >= MAX_SENSOR_SETTINGS) return false;
    for (uint8_t i = 0; i < settingCount; i++) {
        if (settings[i].type == s.type) return false; // one per type
    }
    SensorSetting ns = s;
    ns.id = nextSettingId++;
    settings[settingCount++] = ns;
    saveAllSettings();
    return true;
}

bool Sensor::editSetting(const SensorSetting &s) {
    loadAllSettings();
    for (uint8_t i = 0; i < settingCount; i++) {
        if (settings[i].id == s.id) {
            settings[i].minValue = s.minValue;
            settings[i].maxValue = s.maxValue;
            settings[i].enabled  = s.enabled;
            saveAllSettings();
            return true;
        }
    }
    return false;
}

bool Sensor::removeSetting(uint16_t id) {
    loadAllSettings();
    for (uint8_t i = 0; i < settingCount; i++) {
        if (settings[i].id == id) {
            for (uint8_t j = i; j < settingCount - 1; j++) {
                settings[j] = settings[j+1];
            }
            settingCount--;
            saveAllSettings();
            return true;
        }
    }
    return false;
}

void Sensor::init() {
    LittleFS.begin(true);
    loadAllSettings();
    analogSetWidth(12);
    analogSetPinAttenuation(TDS_PIN, ADC_11db);
    for (int i = 0; i < SCOUNT; i++) { buf[i] = analogRead(TDS_PIN); delay(20); }
    bufIndex = 0;
    float sumV = 0;
    for (int i = 0; i < nCalibSamples; i++) {
        int raw = analogRead(turbidityPin);
        sumV += raw * (3.3f / 4095.0f);
        delay(50);
    }
    Vmax = sumV / nCalibSamples;
}

void Sensor::sample() {
    buf[bufIndex++] = analogRead(TDS_PIN);
    if (bufIndex >= SCOUNT) bufIndex = 0;
}
// TDS Sensor
float Sensor::readTDS() {
    // Copy buffer untuk di‐filter
    int tmp[SCOUNT];
    memcpy(tmp, buf, sizeof(tmp));
    // Median‐filter (bubble sort sederhana)
    for (int i = 0; i < SCOUNT - 1; i++) {
        for (int j = 0; j < SCOUNT - 1 - i; j++) {
            if (tmp[j] > tmp[j + 1]) {
                std::swap(tmp[j], tmp[j + 1]);
            }
        }
    }
    // Ambil nilai median
    int med = (SCOUNT & 1)
              ? tmp[SCOUNT / 2]
              : (tmp[SCOUNT / 2] + tmp[SCOUNT / 2 - 1]) / 2;

    // Konversi ke volt (4096 langkah)
    float voltage = float(med) * VREF / 4096.0f;
    // Kompensasi suhu
    float coeff = 1.0f + 0.02f * (TEMPERATURE - 25.0f);
    float compV = voltage / coeff;
    // Kurva TDS
    float tds = (133.42f * compV*compV*compV
               - 255.86f * compV*compV
               + 857.39f * compV) * 0.5f
               - BASELINE_OFFSET;
    float result = tds > 0 ? tds : 0;
    // Serial.printf("[Sensor] TDS: %.1f ppm\n", result);
    return result;
}

// PH Sensor
float Sensor::readPH(){
    int analogValue = analogRead(phPin);
  float voltage = analogValue * (3.3 / 4095.0);

  // Hitung slope dan intercept dari dua titik kalibrasi
  float slope = (7.0 - 4.0) / (voltage7 - voltage4);
  float intercept = 7.0 - (slope * voltage7);

  // Hitung dan kembalikan nilai pH
  float phValue = slope * voltage + intercept;
    //   Serial.printf("[Sensor] PH: %.1f pH\n", phValue);

  return phValue;
}

// Turbidity Sensor
float Sensor::readTDBT(){
    int rawADC  = analogRead(turbidityPin);
  float voltage = rawADC * (3.3 / 4095.0);

  // Mapping linier ke % kekeruhan
  //   voltage >= Vmax → 0%
  //   voltage <= Vmin → 100%
  float turbPct;
  if (voltage >= Vmax) {
    turbPct = 0.0;
  }
  else if (voltage <= Vmin) {
    turbPct = 100.0;
  }
  else {
    turbPct = (Vmax - voltage) / (Vmax - Vmin) * 100.0;
  }
    // Serial.printf("[Sensor] Turbidity: %.1f %\n", turbPct);

  return turbPct;
}
