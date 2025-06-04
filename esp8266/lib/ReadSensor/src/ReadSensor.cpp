// Sensor.cpp
#include "ReadSensor.h"
#include <Arduino.h>
#include <LittleFS.h>
#include "Config.h"
#include "TelegramBot.h"

// ======================================================
// (1) Konstanta & buffer ADC
// ======================================================
#define SCOUNT          30
#define VREF            3.3f
#define BASELINE_OFFSET 4.3f
static OneWire oneWire(TEMPERATURE_PIN);
static DallasTemperature dsSensor(&oneWire);
extern char deviceId[];  // pastikan dideklarasikan di main.cpp

static int buf[SCOUNT];
static uint8_t bufIndex = 0;
unsigned long Sensor::lastTempRequestMs = 0;

const float voltage7 = 2.51f, voltage4 = 3.11f;
static const int nCalibSamples = 50;
static const float Vmin = 0.50f;
static float Vmax = 3.30f;

#define PH_SCOUNT 30
static int phBuf[PH_SCOUNT];
static uint8_t phBufIndex = 0;
extern bool telegramInitialized; 

// ======================================================
// (2) Static storage definitions untuk persistence
// ======================================================
SensorSetting Sensor::settings[MAX_SENSOR_SETTINGS];
uint8_t       Sensor::settingCount   = 0;
uint16_t      Sensor::nextSettingId  = 1;
bool          Sensor::alerted[MAX_SENSOR_SETTINGS] = { false };

// Nama file di LittleFS
static const char *SENSOR_SETTINGS_FILE = "/sensor_settings.bin";
void Sensor::initTemperatureSensor() {
    dsSensor.begin();
    dsSensor.setWaitForConversion(false); // Non-blocking mode
    dsSensor.requestTemperatures();       // Request pertama
    lastTempRequestMs = millis();
}
float Sensor::readTemperatureC() {
    // Jika sudah lebih dari 750ms sejak request terakhir, request ulang:
    if (millis() - lastTempRequestMs >= 750) {
        dsSensor.requestTemperatures(); 
        lastTempRequestMs = millis();
        // Jangan tunggu selesai di sini; kita akan baca nilai yang lama dulu
    }
    // Kembalikan nilai yang sudah dikonversi atau terakhir tersedia
    return dsSensor.getTempCByIndex(0);
}
// ======================================================
// (3) Fungsi initAllSettings()
//     — Dipanggil SEKALI di setup()
//     — Jika file belum ada atau file ada tetapi
//       jumlah record = 0, tulis default 3 sensor.
//     — Jika file ada dan count > 0, cukup baca dan
//       isi array “settings[]”
// ======================================================
void Sensor::initAllSettings() {
  if (!LittleFS.begin(true)) {
    Serial.println("⚠️ LittleFS.begin() gagal di initAllSettings()");
    return;
  }

  bool needWriteDefaults = false;

  if (!LittleFS.exists(SENSOR_SETTINGS_FILE)) {
    // File belum pernah tercipta → wajib tulis default
    needWriteDefaults = true;
  } else {
    // File sudah ada → baca header (jumlah record)
    File f = LittleFS.open(SENSOR_SETTINGS_FILE, "r");
    if (!f) {
      Serial.println("⚠️ Gagal buka file sensor settings");
      return;
    }
    uint8_t cnt = f.read();  // byte pertama: jumlah setting
    f.close();

    // Jika header cnt == 0 atau cnt > MAX_SENSOR_SETTINGS,
    // artinya tidak ada setting valid di file → kita perlu overwrite default
    if (cnt == 0 || cnt > MAX_SENSOR_SETTINGS) {
      needWriteDefaults = true;
    }
  }

  if (needWriteDefaults) {
    // Buat tiga default setting (Turbidity, TDS, pH)
    settingCount  = 4;
    nextSettingId = 4;  // karena ID 1,2,3 sudah dipakai

 // Index 0: Temperature
    settings[0].id       = 1;
    settings[0].type     = S_TEMPERATURE;
    settings[0].minValue =   26.0f;   // contohnya 0°C
    settings[0].maxValue =  32.0f;   // contohnya 50°C
    settings[0].enabled  =   true;

    // Index 1: Turbidity
    settings[1].id       = 2;
    settings[1].type     = S_TURBIDITY;
    settings[1].minValue =   0.0f;
    settings[1].maxValue = 80.0f;
    settings[1].enabled  =   true;

    // Index 2: TDS
    settings[2].id       = 3;
    settings[2].type     = S_TDS;
    settings[2].minValue =   0.0f;
    settings[2].maxValue = 500.0f;
    settings[2].enabled  =   true;

    // Index 3: pH
    settings[3].id       = 4;
    settings[3].type     = S_PH;
    settings[3].minValue =   6.5f;
    settings[3].maxValue =   8.5f;
    settings[3].enabled  =   true;

    // Tulis default ke file
    File f = LittleFS.open(SENSOR_SETTINGS_FILE, "w");
    if (!f) {
      Serial.println("⚠️ Gagal tulis default sensor settings");
      return;
    }
    f.write(settingCount);
    for (uint8_t i = 0; i < settingCount; i++) {
      f.write((uint8_t *)&settings[i], sizeof(SensorSetting));
    }
    f.close();
    Serial.println("✅ Default sensor settings ditulis ke LittleFS");
  }
  else {
    // Baca array settings[] dari file
    File f = LittleFS.open(SENSOR_SETTINGS_FILE, "r");
    if (!f) {
      Serial.println("⚠️ Gagal buka file sensor settings");
      return;
    }
    uint8_t cnt = f.read();
    if (cnt > MAX_SENSOR_SETTINGS) cnt = 0;
    settingCount = cnt;
    for (uint8_t i = 0; i < settingCount; i++) {
      f.read((uint8_t *)&settings[i], sizeof(SensorSetting));
    }
    f.close();

    // Hitung nextSettingId untuk mencegah duplikat
    nextSettingId = 1;
    for (uint8_t i = 0; i < settingCount; i++) {
      nextSettingId = max(nextSettingId, uint16_t(settings[i].id + 1));
    }
    Serial.printf("ℹ️ Loaded %u sensor settings dari file\n", settingCount);
  }
}

// ======================================================
// (4) Fungsi saveAllSettings()
//     — Tulis sekali semua setting dari array ke file
// ======================================================
void Sensor::saveAllSettings() {
  if (!LittleFS.begin(true)) {
    Serial.println("⚠️ LittleFS.begin() gagal di saveAllSettings()");
    return;
  }
  File f = LittleFS.open(SENSOR_SETTINGS_FILE, "w");
  if (!f) {
    Serial.println("⚠️ Gagal buka file untuk menulis sensor settings");
    return;
  }
  f.write(settingCount);  // tulis jumlah setting
  for (uint8_t i = 0; i < settingCount; i++) {
    f.write((uint8_t *)&settings[i], sizeof(SensorSetting));
  }
  f.close();
  Serial.println("✅ Sensor settings berhasil disimpan ke LittleFS");
}

// ======================================================
// (5) Fungsi getAllSettings()
//     — HANYA baca dari array RAM, tanpa reload ke file.
// ======================================================
SensorSetting *Sensor::getAllSettings(uint8_t &outCount) {
  outCount = settingCount;
  return settings;
}

// ======================================================
// (6) Fungsi editSetting()
//     — Update satu entry (berdasarkan id), lalu saveAllSettings()
// ======================================================
bool Sensor::editSetting(const SensorSetting &s) {
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

// ======================================================
//  (Opsional) addSetting() + removeSetting()
//    — Jika diperlukan, tambahkan atau hapus jenis sensor di runtime.
//    — Memanggil loadAllSettings() → men‐reload file → mungkin men‐override array.
// ======================================================
bool Sensor::addSetting(const SensorSetting &s) {
  // (Anda bisa memanggil initAllSettings() lebih dahulu jika ingin konsisten)
  loadAllSettings();
  if (settingCount >= MAX_SENSOR_SETTINGS) return false;
  for (uint8_t i = 0; i < settingCount; i++) {
    if (settings[i].type == s.type) return false;  // hanya satu per type
  }
  SensorSetting ns = s;
  ns.id = nextSettingId++;
  settings[settingCount++] = ns;
  saveAllSettings();
  return true;
}

bool Sensor::removeSetting(uint16_t id) {
  loadAllSettings();
  for (uint8_t i = 0; i < settingCount; i++) {
    if (settings[i].id == id) {
      for (uint8_t j = i; j < settingCount - 1; j++) {
        settings[j] = settings[j + 1];
      }
      settingCount--;
      saveAllSettings();
      return true;
    }
  }
  return false;
}

// ======================================================
// (7) Fungsi init() (hardware‐related)
//     — Hanya menginisialisasi ADC / buffer, TIDAK memanggil loadAllSettings()
// ======================================================
void Sensor::init() {
  LittleFS.begin(true);  // Mount LittleFS, tapi array sudah diisi di initAllSettings()
  analogSetWidth(12);
  analogSetPinAttenuation(TDS_PIN, ADC_11db);
  analogSetPinAttenuation(PH_PIN, ADC_11db);    // <<< untuk pH probe
  initTemperatureSensor();
  for (int i = 0; i < SCOUNT; i++) {
    buf[i] = analogRead(TDS_PIN);
    delay(20);
  }
  bufIndex = 0;

  float sumV = 0;
  for (int i = 0; i < nCalibSamples; i++) {
    int raw = analogRead(TURBIDITY_PIN);
    sumV += raw * (3.3f / 4095.0f);
    delay(50);
  }
  Vmax = sumV / nCalibSamples;

  for (int i = 0; i < PH_SCOUNT; i++) {
  phBuf[i] = analogRead(PH_PIN);
  delay(20);
}
phBufIndex = 0;

}

// ======================================================
// (8) Fungsi‐fungsi baca sensor (seperti semula)
// ======================================================
void Sensor::sample() {
  buf[bufIndex++] = analogRead(TDS_PIN);
  if (bufIndex >= SCOUNT) bufIndex = 0;
    phBuf[phBufIndex++] = analogRead(PH_PIN);
  if (phBufIndex >= PH_SCOUNT) phBufIndex = 0;
}

// ======================================================
// (9) Fungsi checkSensorLimits()
//     — Mengecek nilai setiap sensor terhadap min/max
//     — Jika melewati batas dan enabled, tampilkan warning
// ======================================================
void Sensor::checkSensorLimits() {
  for (uint8_t i = 0; i < settingCount; i++) {
    SensorSetting &s = settings[i];
    if (!s.enabled) {
      alerted[i] = false;
      continue;
    }

    float value = 0.0f;
    const char *label = nullptr;
    switch (s.type) {
      case S_TEMPERATURE:
        value = readTemperatureC(); label = "Temperature"; break;
      case S_TURBIDITY:
        value = readTDBT();       label = "Turbidity";   break;
      case S_TDS:
        value = readTDS();        label = "TDS";         break;
      case S_PH:
        value = readPH();         label = "pH";          break;
      default:
        continue;
    }

    yield();  // beri kesempatan scheduler

    char msg[128];
    if ((value < s.minValue || value > s.maxValue) && !alerted[i]) {
      snprintf(
        msg, sizeof(msg),
        "Device: %s\n\n⚠️ %s %.2f di luar batas [%.2f - %.2f]",
        deviceId,
        label, value, s.minValue, s.maxValue
      );
      sendTelegramMessage(String(msg));
      alerted[i] = true;
    }
    else if ((value >= s.minValue && value <= s.maxValue) && alerted[i]) {
      snprintf(
        msg, sizeof(msg),
        "Device: %s\n\n✅ %s %.2f sudah normal kembali [%.2f - %.2f]",
        deviceId,
        label, value, s.minValue, s.maxValue
      );
      sendTelegramMessage(String(msg));
      alerted[i] = false;
    }

    yield();
  }
}

float Sensor::readTDS() {
  int tmp[SCOUNT];
  memcpy(tmp, buf, sizeof(tmp));
  // Median‐filter sederhana
  for (int i = 0; i < SCOUNT - 1; i++) {
    for (int j = 0; j < SCOUNT - 1 - i; j++) {
      if (tmp[j] > tmp[j + 1]) {
        std::swap(tmp[j], tmp[j + 1]);
      }
    }
  }
  int med = (SCOUNT & 1) ? tmp[SCOUNT / 2]
                         : (tmp[SCOUNT / 2] + tmp[SCOUNT / 2 - 1]) / 2;
  float voltage = float(med) * VREF / 4096.0f;
  float coeff = 1.0f + 0.02f * (TEMPERATURE - 25.0f);
  float compV = voltage / coeff;
  float tds =
      (133.42f * compV * compV * compV - 255.86f * compV * compV + 857.39f * compV) * 0.5f -
      BASELINE_OFFSET;
  return (tds > 0) ? tds : 0;
}

float Sensor::readPH() {
  int analogValue = analogRead(PH_PIN);
  float voltage = analogValue * (3.3f / 4095.0f);
  float slope = (7.0 - 4.0) / (voltage7 - voltage4);
  float intercept = 7.0 - slope * voltage7;
  float phValue = slope * voltage + intercept;
  return phValue;
}

float Sensor::readTDBT() {
  int rawADC = analogRead(TURBIDITY_PIN);
  float voltage = rawADC * (3.3f / 4095.0f);
  float turbPct;
  if (voltage >= Vmax) {
    turbPct = 0.0f;
  } else if (voltage <= Vmin) {
    turbPct = 100.0f;
  } else {
    turbPct = (Vmax - voltage) / (Vmax - Vmin) * 100.0f;
  }
  return turbPct;
}
