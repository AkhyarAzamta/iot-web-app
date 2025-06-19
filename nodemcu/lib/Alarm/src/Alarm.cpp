#include "Alarm.h"
#include <LittleFS.h>
#include <RTClib.h>
#include <Arduino.h>
#include "Config.h"

static const char *ALARM_FILE = "/alarms.bin";
extern RTC_DS3231 rtc;

// ======= DATA GLOBAL (file‐scope) =======
static AlarmData alarms[MAX_ALARMS]; // array penyimpanan alarm
static uint8_t alarmCount = 0;       // jumlah alarm saat ini
static uint8_t tempCounter = 0;      // untuk generate ID sementara offline
static uint16_t nextAlarmId = 1;     // ID berikutnya (dari backend)
static bool feeding = false;         // state output (contoh: buzzer/relay)
static unsigned long feedingEnd = 0; // waktu kapan mematikan output
static bool isEditing = false;       // true jika user sedang di‐edit via tombol/display

// ======= DEFINISI MEMBER STATIC =======
String Alarm::lastMessage; // <<<< Definisi sebenarnya (harus ada satu kali di .cpp)

const String &Alarm::getLastMessage()
{
  return lastMessage;
}

void Alarm::loadAll()
{
  if (!LittleFS.exists(ALARM_FILE))
  {
    alarmCount = 0;
    nextAlarmId = 1;
    return;
  }
  File f = LittleFS.open(ALARM_FILE, "r");
  if (!f)
    return;
  uint8_t cnt = f.read();
  if (cnt > MAX_ALARMS)
    cnt = 0;
  alarmCount = cnt;
  for (uint8_t i = 0; i < alarmCount; i++)
  {
    f.read((uint8_t *)&alarms[i], sizeof(AlarmData));
  }
  f.close();

  // Hitung nextAlarmId = max(existing IDs + 1)
  nextAlarmId = 1;
  for (uint8_t i = 0; i < alarmCount; i++)
  {
    uint16_t candidate = uint16_t(alarms[i].id) + 1;
    nextAlarmId = (nextAlarmId > candidate) ? nextAlarmId : candidate;
  }
}

void Alarm::saveAll()
{
  File f = LittleFS.open(ALARM_FILE, "w");
  if (!f)
    return;
  f.write(alarmCount);
  for (uint8_t i = 0; i < alarmCount; i++)
  {
    f.write((uint8_t *)&alarms[i], sizeof(AlarmData));
  }
  f.close();
}

bool Alarm::exists(uint16_t id)
{
  for (uint8_t i = 0; i < alarmCount; i++)
  {
    if (alarms[i].id == id)
      return true;
  }
  return false;
}

bool Alarm::add(uint16_t id, uint8_t h, uint8_t m, int durSec, bool en)
{
  if (alarmCount >= MAX_ALARMS)
  {
    lastMessage = String("capacity full (id=") + id + ")";
    return false;
  }
  for (uint8_t i = 0; i < alarmCount; i++)
  {
    if (alarms[i].id == id)
    {
      lastMessage = String("id=") + id + " already exists";
      return false;
    }
  }
  alarms[alarmCount] = AlarmData{
      id,     // ID final dari backend
      h,      // jam
      m,      // menit
      durSec, // durasi (detik)
      en,     // enabled
      -1,     // lastDayTrig
      -1,     // lastMinTrig
      false,  // pending (karena ini datang dari backend)
      false,  // isTemporary
      -1      // tempIndex
  };
  alarmCount++;

  // Update nextAlarmId = max(nextAlarmId, id+1)
  {
    uint16_t candidate = uint16_t(id) + 1;
    nextAlarmId = (nextAlarmId > candidate) ? nextAlarmId : candidate;
  }

  lastMessage = String("id=") + id +
                " time=" + (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m +
                " dur=" + durSec + "s en=" + (en ? "1" : "0");
  saveAll();
  return true;
}

bool Alarm::edit(uint16_t id, uint8_t h, uint8_t m, int durSec, bool en)
{
  for (uint8_t i = 0; i < alarmCount; i++)
  {
    if (alarms[i].id == id)
    {
      alarms[i].hour = h;
      alarms[i].minute = m;
      alarms[i].duration = durSec;
      alarms[i].enabled = en;
      alarms[i].pending = false;
      alarms[i].isTemporary = false;
      lastMessage = String("id=") + id +
                    " time=" + (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m +
                    " dur=" + durSec + "s en=" + (en ? "1" : "0");
      saveAll();
      return true;
    }
  }
  lastMessage = String("id=") + id + " not found";
  return false;
}

bool Alarm::remove(uint16_t id)
{
  for (uint8_t i = 0; i < alarmCount; i++)
  {
    if (alarms[i].id == id)
    {
      // Shift semua elemen ke kiri
      for (uint8_t j = i; j < alarmCount - 1; j++)
      {
        alarms[j] = alarms[j + 1];
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

void Alarm::list()
{
  Serial.println("[ALARM] LIST:");
  if (alarmCount == 0)
  {
    Serial.println("  (kosong)");
    return;
  }
  for (uint8_t i = 0; i < alarmCount; i++)
  {
    auto &a = alarms[i];
    Serial.printf(
        "id=%u  %02u:%02u  dur=%ds  en=%d  pend=%d  temp=%d  idx=%d\n",
        a.id, a.hour, a.minute, a.duration,
        a.enabled ? 1 : 0,
        a.pending ? 1 : 0,
        a.isTemporary ? 1 : 0,
        a.tempIndex);
  }
}

void Alarm::checkAll()
{
  if (isEditing)
    return;
  DateTime now = rtc.now();
  int curH = now.hour();
  int curM = now.minute();
  int curS = now.second();
  int curD = now.day();

  // Cek trigger
  for (uint8_t i = 0; i < alarmCount; i++)
  {
    auto &a = alarms[i];
    if (!a.enabled)
      continue;
    if (a.lastDayTrig == curD && a.lastMinTrig == curM)
      continue;
    if (a.hour == curH && a.minute == curM && curS < 5)
    {
      a.lastDayTrig = curD;
      a.lastMinTrig = curM;
      feeding = true;
      feedingEnd = millis() + (uint32_t)a.duration * 1000UL;
      digitalWrite(LED_PIN, LED_ON);
      saveAll();
      break;
    }
  }
  // Matikan feeding jika durasi habis
  if (feeding && millis() >= feedingEnd)
  {
    feeding = false;
    digitalWrite(LED_PIN, LED_OFF);
  }
}

AlarmData *Alarm::getAll(uint8_t &outCount)
{
  outCount = alarmCount;
  return alarms;
}

void Alarm::setEditing(bool editing)
{
  isEditing = editing;
}

void Alarm::addAlarmOffline(uint8_t h, uint8_t m, int durSec, bool en)
{
  if (alarmCount >= MAX_ALARMS)
  {
    lastMessage = "capacity full (offline)";
    return;
  }
  AlarmData a;
  a.id = uint16_t(0xFF00 | tempCounter); // ID sementara: 0xFF00, 0xFF01, …
  a.hour = h;
  a.minute = m;
  a.duration = durSec;
  a.enabled = en;
  a.lastDayTrig = -1;
  a.lastMinTrig = -1;
  a.pending = true;     // tandai nanti perlu di‐sync
  a.isTemporary = true; // tandai ini ID offline
  a.tempIndex = int8_t(tempCounter++);
  alarms[alarmCount++] = a;
  lastMessage = "Offline add: tempIndex=" + String(a.tempIndex);
  saveAll(); // langsung simpan ke LittleFS
}
