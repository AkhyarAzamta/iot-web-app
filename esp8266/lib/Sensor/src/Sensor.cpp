// Sensor.cpp
#include "Sensor.h"
#include <Arduino.h>

#define TDS_PIN         36
#define SCOUNT          30
#define TEMPERATURE     25.0f
#define VREF            3.3f
#define BASELINE_OFFSET 4.3f

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
}

void Sensor::sample() {
    // Masukkan sampel baru ke buffer secara circular
    buf[bufIndex++] = analogRead(TDS_PIN);
    if (bufIndex >= SCOUNT) bufIndex = 0;
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
    Serial.printf("[Sensor] TDS: %.1f ppm\n", result);
    return result;
}
