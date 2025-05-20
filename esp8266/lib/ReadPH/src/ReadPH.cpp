#include <Arduino.h>
#include "ReadPH.h"

const int phPin = 34; // Pin ADC ESP32

// Kalibrasi manual berdasarkan hasil uji
const float voltage7 = 1.86;  // Tegangan saat pH 7
const float voltage4 = 2.10;  // Tegangan saat pH 4

float readPH() {
  int analogValue = analogRead(phPin);
  float voltage = analogValue * (3.3 / 4095.0);

  // Hitung slope dan intercept dari dua titik kalibrasi
  float slope = (7.0 - 4.0) / (voltage7 - voltage4);
  float intercept = 7.0 - (slope * voltage7);

  // Hitung dan kembalikan nilai pH
  float phValue = slope * voltage + intercept;
  return phValue;
}
