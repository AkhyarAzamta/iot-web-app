#ifndef ALARM_H
#define ALARM_H

#include <Arduino.h>

// Maksimum alarm yang disimpan
static const uint8_t MAX_ALARMS = 10;

// Data struktur alarm
struct AlarmData {
  uint16_t id;
  uint8_t  hour;
  uint8_t  minute;
  int      duration;
  int      lastDayTrig;
  int      lastMinTrig;
  bool     enabled;
};

class Alarm {
public:
  // Load & simpan dari LittleFS
  static void loadAll();
  static void saveAll();
  
  // Manajemen alarm
  static AlarmData* getAll(uint8_t &outCount);
  static bool exists(uint16_t id);
  static bool add(uint16_t id, uint8_t h, uint8_t m, int durSec, bool en);
  static bool edit(uint16_t id, uint8_t h, uint8_t m, int durSec, bool en);
  static bool remove(uint16_t id);
  static void list();


  static void setEditing(bool editing);


  // Cek trigger alarm dan jalankan feeding
  static void checkAll();

  static const String& getLastMessage();

private:
  static String lastMessage;

};

#endif // ALARM_H