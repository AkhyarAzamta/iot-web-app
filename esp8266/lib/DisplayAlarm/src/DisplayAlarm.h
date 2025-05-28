#ifndef DISPLAY_ALARM_H
#define DISPLAY_ALARM_H

#include <Arduino.h>
#include "Display.h"
#include "Config.h"
#include "Alarm.h"
#include <RTClib.h>

#define MAX_ALARMS    10
#define DEBOUNCE_MS   200

enum EditField { F_TIME, F_DURATION, F_SAVE, F_DELETE };

class DisplayAlarm {
public:
  DisplayAlarm();
  void loop();

private:
  void renderMenu(const DateTime &now);
  void readButtons();
  void checkAlarms(const DateTime &now);

  // AlarmData alarms[MAX_ALARMS];
  // uint8_t alarmCount = 0;

  AlarmData* alarms = nullptr;
  uint8_t alarmCount = 0;

  bool    inEdit      = false;
  uint8_t editIndex   = 0;
  EditField editField = F_TIME;

  bool    timeEditing = false;
  uint8_t timeCursor  = 0;  // 0=hour,1=minute,2=status

  uint8_t pageStart   = 0;
  uint8_t cursorPos   = 0;  // 0..3

  unsigned long lastDebounce = 0;
  bool          lastInEdit   = false;
};

#endif // DISPLAY_ALARM_H
