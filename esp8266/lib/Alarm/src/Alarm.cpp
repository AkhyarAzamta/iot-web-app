#include "Alarm.h"
#include <LittleFS.h>
#include <RTClib.h>
#include <Arduino.h>
#include "Config.h"

static const char* ALARM_FILE = "/alarms.bin";

static AlarmData alarms[MAX_ALARMS];
static uint8_t alarmCount = 0;
static uint16_t nextAlarmId = 1;
static bool feeding = false;
static unsigned long feedingEnd = 0;
String Alarm::lastMessage = "";

extern RTC_DS3231 rtc;

const String& Alarm::getLastMessage() {
  return lastMessage;
}

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

bool Alarm::exists(uint16_t id) {
  for (uint8_t i = 0; i < alarmCount; i++) {
    if (alarms[i].id == id) return true;
  }
  return false;
}

bool Alarm::add(uint16_t id, uint8_t h, uint8_t m, int durSec) {
  if (alarmCount >= MAX_ALARMS) {
    lastMessage = String("capacity full (id=") + id + ")";
    return false;}
  for (uint8_t i = 0; i < alarmCount; i++) {
    if (alarms[i].id == id) {
      lastMessage = String("id=") + id + " already exists";
      return false;}
  }
  alarms[alarmCount++] = { id, h, m, durSec, -1, -1 };
  nextAlarmId = max(nextAlarmId, uint16_t(id + 1));
  lastMessage = String("id=") + id +
                " time=" + (h<10?"0":"") + h + ":" + (m<10?"0":"") + m +
                " dur=" + durSec + "s";
  saveAll();
  return true;
}

bool Alarm::edit(uint16_t id, uint8_t h, uint8_t m, int durSec) {
  for (uint8_t i = 0; i < alarmCount; i++) {
    if (alarms[i].id == id) {
      alarms[i].hour     = h;
      alarms[i].minute   = m;
      alarms[i].duration = durSec;
      lastMessage = String("id=") + id +
                    " time=" + (h<10?"0":"") + h + ":" + (m<10?"0":"") + m +
                    " dur=" + durSec + "s";
      saveAll();
      return true;
    }
  }
  lastMessage = String("id=") + id + " not found";
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
      lastMessage = String("id=") + id + " deleted";
      saveAll();
      return true;
    }
  }
  lastMessage = String("id=") + id + " not found";
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

AlarmData* Alarm::getAll(uint8_t &outCount) {
  outCount = alarmCount;
  return alarms;
}