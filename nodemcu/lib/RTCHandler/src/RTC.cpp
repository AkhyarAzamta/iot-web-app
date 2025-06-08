// RTC.cpp
#include "RTC.h"
#include "Config.h"
#include <Wire.h>
#include <Arduino.h>
#include <WiFi.h>
#include <time.h>

RTCHandler::RTCHandler() {}

void RTCHandler::setupRTC() {
    // 1) Inisialisasi I2C dan modul DS3231
    Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);  // sesuaikan SDA/SCL
    if (!rtc.begin()) {
        Serial.println("[RTC] DS3231 not found!");
        while (1) {
            delay(1000);
        }
    }
    rtc.clearAlarm(1);
    rtc.clearAlarm(2);
    rtc.disable32K();

    // 2) Sinkronisasi waktu via SNTP—hanya kalau WiFi aktif
    if (wifiEnabled) {
        const char* ntpServer       = "pool.ntp.org";
        const long  gmtOffset_sec   = 7 * 3600;   // WIB (UTC+7)
        const int   daylightOffset  = 0;

        configTime(gmtOffset_sec, daylightOffset, ntpServer);
        Serial.print("[RTC] Waiting for SNTP sync");
        
        struct tm timeinfo;
        unsigned long start = millis();
        bool synced = false;

        // Tunggu hingga getLocalTime() berhasil atau timeout 5 detik
        while (millis() - start < 5000) {
            if (getLocalTime(&timeinfo)) {
                synced = true;
                break;
            }
            Serial.print(".");
            delay(500);
        }

        if (synced) {
            Serial.println("\n[RTC] SNTP sync OK");
            // Set waktu ke RTC modul DS3231
            DateTime now(
                timeinfo.tm_year + 1900,
                timeinfo.tm_mon + 1,
                timeinfo.tm_mday,
                timeinfo.tm_hour,
                timeinfo.tm_min,
                timeinfo.tm_sec
            );
            rtc.adjust(now);
            Serial.printf(
                "[RTC] Time set: %04d-%02d-%02d %02d:%02d:%02d\n",
                timeinfo.tm_year + 1900,
                timeinfo.tm_mon + 1,
                timeinfo.tm_mday,
                timeinfo.tm_hour,
                timeinfo.tm_min,
                timeinfo.tm_sec
            );
        } else {
            Serial.println("\n[RTC] SNTP sync timeout, skip");
        }
    }
    else {
        Serial.println("[RTC] WiFi OFF, skip SNTP sync");
    }
}

String RTCHandler::getTime() {
  DateTime now = rtc.now();
  char buffer[9];
  sprintf(buffer, "%02d:%02d:%02d", now.hour(), now.minute(), now.second());
  return String(buffer);
}

String RTCHandler::getDate() {
  DateTime now = rtc.now();
  return String(now.day()) + "/" + String(now.month()) + "/" + String(now.year());
}