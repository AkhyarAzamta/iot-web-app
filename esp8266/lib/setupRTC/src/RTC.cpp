#include "RTC.h"
#include <Wire.h>
#include <Arduino.h>

RTC_DS3231 rtc;

void setupRTC() {
    Wire.begin(21, 22); // SDA, SCL
    if (!rtc.begin()) {
        Serial.println("[RTC] DS3231 not found!");
        while (1) delay(1000);
    }
    rtc.clearAlarm(1);
    rtc.clearAlarm(2);
    rtc.disable32K();
}