#include "Alarm.h"
#include <LittleFS.h>
#include <RTClib.h>
#include <Arduino.h>

// File path untuk penyimpanan alarm
static const char* ALARM_FILE = "/alarms.bin";

// State internal
static AlarmData alarms[MAX_ALARMS];
static uint8_t alarmCount = 0;
static uint16_t nextAlarmId = 1;
static bool feeding = false;
static unsigned long feedingEnd = 0;

// RTC instance (dari modul RTC)
extern RTC_DS3231 rtc;

// LED builtin
#ifndef LED_PIN
#define LED_PIN 2
#endif
#ifndef LED_ON
#define LED_ON HIGH
#define LED_OFF LOW
#endif

void Alarm::loadAll() {
  if (!LittleFS.exists(ALARM_FILE)) {
    alarmCount = 0;
    nextAlarmId = 1;
    return;
  }
  File f = LittleFS.open(ALARM_FILE, "r");
  if (!f) return;
  uint8_t cnt = f.read();
  if (cnt > MAX_ALARMS) cnt = 0;
  alarmCount = cnt;
  for (uint8_t i = 0; i < alarmCount; i++) {
    f.read((uint8_t*)&alarms[i], sizeof(AlarmData));
  }
  f.close();
  // rebuild nextId
  nextAlarmId = 1;
  for (uint8_t i = 0; i < alarmCount; i++) {
    nextAlarmId = max(nextAlarmId, uint16_t(alarms[i].id + 1));
  }
}

void Alarm::saveAll() {
  File f = LittleFS.open(ALARM_FILE, "w");
  if (!f) return;
  f.write(alarmCount);
  for (uint8_t i = 0; i < alarmCount; i++) {
    f.write((uint8_t*)&alarms[i], sizeof(AlarmData));
  }
  f.close();
}

bool Alarm::add(uint16_t id, uint8_t h, uint8_t m, int durSec) {
  if (alarmCount >= MAX_ALARMS) {
        Serial.printf("[ALARM] ADD GAGAL: kapasitas penuh (id=%u)\n", id);

    return false;}
  for (uint8_t i = 0; i < alarmCount; i++) {
    if (alarms[i].id == id) {
            Serial.printf("[ALARM] ADD GAGAL: id=%u sudah ada\n", id);

      return false;}
  }
  alarms[alarmCount++] = { id, h, m, durSec, -1, -1 };
  nextAlarmId = max(nextAlarmId, uint16_t(id + 1));
    Serial.printf("[ALARM] ADD  id=%u  time=%02u:%02u  dur=%ds\n",
                id, h, m, durSec);
  saveAll();
  return true;
}

bool Alarm::edit(uint16_t id, uint8_t h, uint8_t m, int durSec) {
  for (uint8_t i = 0; i < alarmCount; i++) {
    if (alarms[i].id == id) {
      alarms[i].hour     = h;
      alarms[i].minute   = m;
      alarms[i].duration = durSec;
      saveAll();
      return true;
    }
  }
  return false;
}

bool Alarm::remove(uint16_t id) {
  for (uint8_t i = 0; i < alarmCount; i++) {
    if (alarms[i].id == id) {
      // shift left
      for (uint8_t j = i; j < alarmCount - 1; j++) {
        alarms[j] = alarms[j+1];
      }
      alarmCount--;
      saveAll();
      return true;
    }
  }
  return false;
}

void Alarm::list() {
  Serial.println("[ALARM] LIST:");
  if (alarmCount == 0) {
    Serial.println("  (kosong)");
    return;
  }
  for (uint8_t i = 0; i < alarmCount; i++) {
    auto &a = alarms[i];
    Serial.printf("id=%u  %02u:%02u  dur=%ds ", a.id, a.hour, a.minute, a.duration);
  }
}

void Alarm::checkAll() {
  DateTime now = rtc.now();
  int curH = now.hour();
  int curM = now.minute();
  int curS = now.second();
  int curD = now.day();

  // Trigger alarm
  for (uint8_t i = 0; i < alarmCount; i++) {
    auto &a = alarms[i];
    if (a.lastDayTrig == curD && a.lastMinTrig == curM) continue;
    if (a.hour == curH && a.minute == curM && curS < 5) {
      a.lastDayTrig = curD;
      a.lastMinTrig = curM;
      feeding = true;
      feedingEnd = millis() + (uint32_t)a.duration * 1000UL;
      digitalWrite(LED_PIN, LED_ON);
      saveAll();
      break;
    }
  }
  // Stop feeding
  if (feeding && millis() >= feedingEnd) {
    feeding = false;
    digitalWrite(LED_PIN, LED_OFF);
  }
}