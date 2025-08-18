// DisplayAlarm.h
#ifndef DISPLAY_ALARM_H
#define DISPLAY_ALARM_H

#include <Arduino.h>
#include "Display.h"
#include "Config.h"
#include "Alarm.h"
#include "ReadSensor.h"
#include <RTClib.h>

#define MAX_ALARMS 10
#define DEBOUNCE_MS 200

enum EditField
{
  F_TIME,
  F_DURATION,
  F_SAVE,
  F_DELETE
};
enum EditSensorField
{
  F_S_MINMAX,
  F_S_STATUS,
  F_S_SAVE,
  F_S_BACK
};
enum Page
{
  PAGE_ALARM,
  PAGE_SENSOR
};

class DisplayAlarm
{
public:
  DisplayAlarm();
  void loop();
  void reloadAlarms();

private:
  // core
  void renderMenu(const DateTime &now);
  void readButtons();

  // rendering
  void renderAlarmPage(const DateTime &now);
  void renderSensorPage();
  void renderSetAlarm(const DateTime &now);
  void renderSetSensor();
  void renderEditPage(
      const char *titleFmt,
      uint8_t totalFields,
      uint8_t fieldCursor,
      bool valueEditing,
      bool isSensor);

  // data
  AlarmData *alarms = nullptr;
  uint8_t alarmCount = 0;
  SensorSetting *sensors = nullptr;
  uint8_t sensorCount = 4;

  // edit state alarm
  bool inEdit = false;
  uint8_t editIndex = 0;
  EditField editField = F_TIME;
  bool timeEditing = false;
  uint8_t timeCursor = 0;
  bool editingIsAdd = false;

  // edit state sensor
  EditSensorField editSensorField = F_S_MINMAX;
  bool sensorEditing = false;
  uint8_t sensorCursor = 0;

  // navigation
  Page currentPage = PAGE_SENSOR; // default to sensor page
  uint8_t pageStart = 0;
  uint8_t cursorPos = 0;

  // debounce
  unsigned long lastDebounce = 0;
  bool lastInEdit = false;
};

#endif // DISPLAY_ALARM_H
