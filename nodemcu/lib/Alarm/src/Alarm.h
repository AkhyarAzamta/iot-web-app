#ifndef ALARM_H
#define ALARM_H

#include <Arduino.h>

static const uint8_t MAX_ALARMS = 10;

struct AlarmData
{
  uint16_t id;
  uint8_t hour;
  uint8_t minute;
  int duration;
  bool enabled;
  int lastDayTrig;
  int lastMinTrig;
  bool pending;     // perlu disinkron ke backend?
  bool isTemporary; // ID sementara jika offline
  int8_t tempIndex; // indeks for matching ACK
};

class Alarm
{
public:
  // Load & save dari LittleFS
  static void loadAll();
  static void saveAll();

  // Akses data alarm
  static AlarmData *getAll(uint8_t &outCount);
  static bool exists(uint16_t id);
  static bool add(uint16_t id, uint8_t h, uint8_t m, int durSec, bool en);
  static bool edit(uint16_t id, uint8_t h, uint8_t m, int durSec, bool en);
  static bool enable(uint16_t id, bool en);
  static bool remove(uint16_t id);
  static void list();

  // Tambah alarm saat offline (ID sementara)
  static void addAlarmOffline(uint8_t h, uint8_t m, int durSec, bool en);

  // Tandai sedang edit via display, agar checkAll() menunda trig
  static void setEditing(bool editing);

  // Periksa dan trigger alarm
  static void checkAll();

  // Ambil pesan terakhir (dipakai untuk ACK MQTT, dsb.)
  static const String &getLastMessage();

private:
  // Deklarasi member static, _tanpa_ inisialisasi di sini
  static String lastMessage;
};

#endif // ALARM_H
