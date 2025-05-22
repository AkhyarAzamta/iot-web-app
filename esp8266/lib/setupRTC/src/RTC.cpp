// RTC.cpp
#include "RTC.h"
#include <Wire.h>
#include <Arduino.h>
#include <WiFi.h>
#include <time.h>

RTC_DS3231 rtc;

void setupRTC() {
    // 1) Inisialisasi I2C dan modul RTC
    Wire.begin(21, 22); // SDA, SCL
    if (!rtc.begin()) {
        Serial.println("[RTC] DS3231 not found!");
        while (1) delay(1000);
    }
    rtc.clearAlarm(1);
    rtc.clearAlarm(2);
    rtc.disable32K();

    // 2) Sinkronisasi waktu via SNTP (pool.ntp.org, WIB UTC+7)
    const char* ntpServer = "pool.ntp.org";
    const long gmtOffset_sec = 7 * 3600;
    const int daylightOffset_sec = 0;

    configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
    Serial.print("[RTC] Waiting for SNTP sync");
    struct tm timeinfo;
    // tunggu hingga SNTP valid
    while (!getLocalTime(&timeinfo)) {
        Serial.print(".");
        delay(500);
    }
    Serial.println("\n[RTC] SNTP sync OK");
    
    // 3) Ambil waktu dan tulis ke RTC
    DateTime now(
        timeinfo.tm_year + 1900,
        timeinfo.tm_mon + 1,
        timeinfo.tm_mday,
        timeinfo.tm_hour,
        timeinfo.tm_min,
        timeinfo.tm_sec
    );
    rtc.adjust(now);
    Serial.printf("[RTC] Time set: %04d-%02d-%02d %02d:%02d:%02d\n", 
        timeinfo.tm_year + 1900,
        timeinfo.tm_mon + 1,
        timeinfo.tm_mday,
        timeinfo.tm_hour,
        timeinfo.tm_min,
        timeinfo.tm_sec
    );
}
