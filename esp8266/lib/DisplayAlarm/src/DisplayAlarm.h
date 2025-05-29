// DisplayAlarm.h
#ifndef DISPLAY_ALARM_H
#define DISPLAY_ALARM_H

#include <Arduino.h>
#include "Display.h"
#include "Config.h"
#include "Alarm.h"
#include "Sensor.h"
#include <RTClib.h>

#define MAX_ALARMS    10
#define DEBOUNCE_MS   200

enum EditField { F_TIME, F_DURATION, F_SAVE, F_DELETE };
enum Page      { PAGE_ALARM, PAGE_SENSOR };

class DisplayAlarm {
public:
  DisplayAlarm();
  void loop();

private:
  // core
  void renderMenu(const DateTime &now);
  void readButtons();

  // rendering
  void renderSetAlarm(const DateTime &now);
  void renderAlarmPage(const DateTime &now);
  void renderSensorPage();

  // data
  AlarmData* alarms     = nullptr;
  uint8_t    alarmCount = 0;

  // edit state
  bool      inEdit      = false;
  uint8_t   editIndex   = 0;
  EditField editField   = F_TIME;
  bool      timeEditing = false;
  uint8_t   timeCursor  = 0;  // 0=hour,1=minute,2=status

  // navigation state
  Page      currentPage = PAGE_ALARM;
  uint8_t   pageStart   = 0;  // untuk paging alarm
  uint8_t   cursorPos   = 0;  // 0..3 pada alarm page

  // debounce
  unsigned long lastDebounce = 0;
  bool          lastInEdit   = false;
};

#endif // DISPLAY_ALARM_H
