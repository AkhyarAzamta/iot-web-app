// Sensor.cpp
#include "Sensor.h"
#include <Arduino.h>
#include "Config.h"

#define SCOUNT          30
#define VREF            3.3f
#define BASELINE_OFFSET 4.3f

// PH Sensor
const float voltage7 = 1.86;  // Tegangan saat pH 7
const float voltage4 = 2.10;  // Tegangan saat pH 4

// Turbidity
static const int    nCalibSamples  = 50;    // jumlah sampel kalibrasi
static const float  Vmin           = 0.50;  // tegangan saat air paling keruh
static float        Vmax           = 3.30;  // akan di-overwrite di init()

static int buf[SCOUNT];
static uint8_t bufIndex = 0;

void Sensor::init() {
    analogSetWidth(12);
    analogSetPinAttenuation(TDS_PIN, ADC_11db);
    // Prefill buffer dengan beberapa bacaan awal untuk start-up
    for (int i = 0; i < SCOUNT; i++) {
        buf[i] = analogRead(TDS_PIN);
        delay(20);
    }
    bufIndex = 0;

     float sumV = 0;
  for (int i = 0; i < nCalibSamples; i++) {
    int raw = analogRead(turbidityPin);
    float v = raw * (3.3 / 4095.0);
    sumV += v;
    delay(50);
  }
  Vmax = sumV / nCalibSamples;
}

void Sensor::sample() {
    // Masukkan sampel baru ke buffer secara circular
    buf[bufIndex++] = analogRead(TDS_PIN);
    if (bufIndex >= SCOUNT) bufIndex = 0;

    int analogValue = analogRead(phPin);
    float voltage = analogValue * (3.3 / 4095.0);
}

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
