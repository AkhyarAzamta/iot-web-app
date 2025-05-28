#include "DisplayAlarm.h"
#include "MQTT.h"

// Global instances
extern Display lcd;
extern RTC_DS3231 rtc;

DisplayAlarm::DisplayAlarm() {}


void DisplayAlarm::loop() {
  alarms = Alarm::getAll(alarmCount);
  DateTime now = rtc.now();
  readButtons();
  renderMenu(now);
}

void DisplayAlarm::renderMenu(const DateTime &now) {
  // clear once on mode change
  if (inEdit != lastInEdit) {
    lcd.clear();
    lastInEdit = inEdit;
    Alarm::setEditing(lastInEdit);
  }

  char buf[21];
  if (inEdit) {
    // Title
    snprintf(buf, 21, "Edit Alarm %d", editIndex + 1);
    lcd.printLine(0, buf);

    // Time field
    if (timeEditing) {
      if (timeCursor == 0)
        snprintf(buf, 21, "> Time : [%02d]:%02d %s",
          alarms[editIndex].hour, alarms[editIndex].minute,
          alarms[editIndex].enabled ? "ON" : "OFF");
      else if (timeCursor == 1)
        snprintf(buf, 21, "> Time : %02d:[%02d] %s",
          alarms[editIndex].hour, alarms[editIndex].minute,
          alarms[editIndex].enabled ? "ON" : "OFF");
      else
        snprintf(buf, 21, "> Time : %02d:%02d [%s]",
          alarms[editIndex].hour, alarms[editIndex].minute,
          alarms[editIndex].enabled ? "ON" : "OFF");
    } else {
      snprintf(buf, 21,
        editField == F_TIME ? "> Time : %02d:%02d %s" : "  Time : %02d:%02d %s",
        alarms[editIndex].hour, alarms[editIndex].minute,
        alarms[editIndex].enabled ? "ON" : "OFF");
    }
    lcd.printLine(1, buf);

    // Duration field
    snprintf(buf, 21,
      editField == F_DURATION ? "> Duration : %2ds" : "  Duration : %2ds",
      alarms[editIndex].duration);
    lcd.printLine(2, buf);

    // Save/Delete line
    char line3[21];
    // Save
    if (editField == F_SAVE) strcpy(line3, "> Save");
    else                     strcpy(line3, "  Save");
    // pad to col 12
    int len = strlen(line3);
    for (int i = len; i < 12; i++) line3[i] = ' ';
    // Del
    if (editField == F_DELETE) strcat(line3, "> Del");
    else                        strcat(line3, "  Del");
    // pad remainder
    len = strlen(line3);
    for (int i = len; i < 20; i++) line3[i] = ' ';
    line3[20] = '\0';
    lcd.printLine(3, line3);
  } else {
    // Main mode
    snprintf(buf, 21, "Time %02d:%02d:%02d",
      now.hour(), now.minute(), now.second());
    lcd.printLine(0, buf);

    // up to 2 alarms
    for (uint8_t row = 0; row < 2; row++) {
      uint8_t idx = pageStart + row;
      if (idx < alarmCount) {
        auto &a = alarms[idx];
        snprintf(buf, 21,
          cursorPos == row ? "> Alarm %d:%02d:%02d %s" : "  Alarm %d:%02d:%02d %s",
          idx+1, alarms[idx].hour, alarms[idx].minute,
          alarms[idx].enabled ? "ON" : "OFF");
      } else {
        strcpy(buf, "                    ");
      }
      lcd.printLine(row + 1, buf);
    }

    // ADD Alarm
    snprintf(buf, 21,
      cursorPos == 3 ? "> ADD Alarm" : "  ADD Alarm");
    lcd.printLine(3, buf);
  }
}

void DisplayAlarm::readButtons() {
  if (millis() - lastDebounce < DEBOUNCE_MS) return;

  bool up    = !digitalRead(BTN_UP);
  bool down  = !digitalRead(BTN_DOWN);
  bool left  = !digitalRead(BTN_LEFT);
  bool right = !digitalRead(BTN_RIGHT);
  bool sel   = !digitalRead(BTN_SELECT);
  if (!(up || down || left || right || sel)) return;
  lastDebounce = millis();

  if (inEdit) {
    // TIME field
    if (editField == F_TIME) {
      // Enter/exit time editing
      if (sel && !timeEditing) {
        timeEditing = true;
        timeCursor  = 0;
        return;
      }
      if (timeEditing) {
        // UP/DOWN on hour/minute/toggle
        if (up) {
          switch (timeCursor) {
            case 0:
              alarms[editIndex].hour = (alarms[editIndex].hour + 1) % 24;
              break;
            case 1:
              alarms[editIndex].minute = (alarms[editIndex].minute + 1) % 60;
              break;
            case 2:
              alarms[editIndex].enabled = !alarms[editIndex].enabled;
              break;
          }
        }
        if (down) {
          switch (timeCursor) {
            case 0:
              alarms[editIndex].hour = (alarms[editIndex].hour + 23) % 24;
              break;
            case 1:
              alarms[editIndex].minute = (alarms[editIndex].minute + 59) % 60;
              break;
            case 2:
              alarms[editIndex].enabled = !alarms[editIndex].enabled;
              break;
          }
        }
        // Move cursor left/right, exit on sel
        if (left  && timeCursor > 0) timeCursor--;
        if (right && timeCursor < 2) timeCursor++;
        if (sel)   timeEditing = false;
        return;
      }
      // Navigate between fields when not editing time
      if (up)   editField = F_DELETE;
      if (down) editField = F_DURATION;
      if (sel)  editField = F_DURATION;
    }
    // DURATION field
    else if (editField == F_DURATION) {
      if (up)   editField = F_TIME;
      if (down) editField = F_SAVE;
      if (left)  alarms[editIndex].duration = (alarms[editIndex].duration + 99) % 100;
      if (right) alarms[editIndex].duration = (alarms[editIndex].duration + 1) % 100;
    }
    // SAVE field
    else if (editField == F_SAVE) {
      if (up)   editField = F_DURATION;
      if (down) editField = F_DELETE;
      if (sel) {
        inEdit      = false;
        timeEditing = false;
        editField   = F_TIME;
        // Publish ADD or EDIT...
        uint16_t id = alarms[editIndex].id;
        uint8_t h   = alarms[editIndex].hour;
        uint8_t m   = alarms[editIndex].minute;
        int     d   = alarms[editIndex].duration;
        if (id == 0) publishAlarmFromESP("ADD", id, h, m, d);
        else         publishAlarmFromESP("EDIT", id, h, m, d);
      }
    }
    // DELETE field
    else if (editField == F_DELETE) {
      if (up)   editField = F_SAVE;
      if (down) editField = F_TIME;
      if (sel) {
        uint16_t id = alarms[editIndex].id;
        // Shift-left remove
        for (uint8_t i = editIndex; i < alarmCount - 1; i++)
          alarms[i] = alarms[i + 1];
        alarmCount--;
        inEdit      = false;
        timeEditing = false;
        editField   = F_TIME;
        pageStart   = 0;
        cursorPos   = 0;
        deleteAlarmFromESP(id);
      }
    }
  }
  else {
    // MAIN navigation (list + ADD Alarm)
    if (up) {
      if (cursorPos > 0) cursorPos--;
      else if (pageStart >= 2) { pageStart -= 2; cursorPos = 3; }
    }
    if (down) {
      if (cursorPos < 3) cursorPos++;
      else if (alarmCount > pageStart + 2) { pageStart += 2; cursorPos = 0; }
    }
    if (sel) {
      if (cursorPos < 2 && pageStart + cursorPos < alarmCount) {
        inEdit      = true;
        editIndex   = pageStart + cursorPos;
        editField   = F_TIME;
        timeEditing = false;
        timeCursor  = 0;
      }
      else if (cursorPos == 3 && alarmCount < MAX_ALARMS) {
        // ADD new alarm with full initialization
        alarms[alarmCount++] = AlarmData{
          0,    // id
          0,    // hour
          0,    // minute
          10,   // duration
          -1,   // lastDayTrig
          -1,   // lastMinTrig
          true  // enabled
        };
        inEdit      = true;
        editIndex   = alarmCount - 1;
        editField   = F_TIME;
        timeEditing = false;
        timeCursor  = 0;
      }
    }
  }
}