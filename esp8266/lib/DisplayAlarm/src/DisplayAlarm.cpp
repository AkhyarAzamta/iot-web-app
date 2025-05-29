// DisplayAlarm.cpp
#include "DisplayAlarm.h"
#include "MQTT.h"

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
  if (inEdit != lastInEdit) {
    lcd.clear();
    lastInEdit = inEdit;
    Alarm::setEditing(lastInEdit);
  }

  if (inEdit) {
    renderSetAlarm(now);
  } else {
    if (currentPage == PAGE_ALARM)
      renderAlarmPage(now);
    else
      renderSensorPage();
  }
}

void DisplayAlarm::renderSetAlarm(const DateTime &now) {
  char buf[21];
  snprintf(buf, 21, "Edit Alarm %d", editIndex + 1);
  lcd.printLine(0, buf);

  if (timeEditing) {
    if (timeCursor == 0)
      snprintf(buf,21,"> Time : [%02d]:%02d %s",
        alarms[editIndex].hour, alarms[editIndex].minute,
        alarms[editIndex].enabled ? "ON":"OFF");
    else if (timeCursor == 1)
      snprintf(buf,21,"> Time : %02d:[%02d] %s",
        alarms[editIndex].hour, alarms[editIndex].minute,
        alarms[editIndex].enabled ? "ON":"OFF");
    else
      snprintf(buf,21,"> Time : %02d:%02d [%s]",
        alarms[editIndex].hour, alarms[editIndex].minute,
        alarms[editIndex].enabled ? "ON":"OFF");
  } else {
    snprintf(buf,21,
      editField==F_TIME ? "> Time : %02d:%02d %s" : "  Time : %02d:%02d %s",
      alarms[editIndex].hour, alarms[editIndex].minute,
      alarms[editIndex].enabled ? "ON":"OFF");
  }
  lcd.printLine(1, buf);

  snprintf(buf,21,
    editField==F_DURATION ? "> Duration : %2ds" : "  Duration : %2ds",
    alarms[editIndex].duration);
  lcd.printLine(2, buf);

  char line3[21];
  strcpy(line3, (editField==F_SAVE) ? "> Save     " : "  Save     ");
  strcat(line3, (editField==F_DELETE) ? "> Del" : "  Del");
  lcd.printLine(3, line3);
}

void DisplayAlarm::renderAlarmPage(const DateTime &now) {
  char buf[21];
  snprintf(buf,21,"Time : %02d:%02d:%02d",
           now.hour(), now.minute(), now.second());
  lcd.printLine(0, buf);

  for (uint8_t row=0; row<2; row++) {
    uint8_t idx = pageStart + row;
    if (idx < alarmCount) {
      auto &a = alarms[idx];
      snprintf(buf,21,
        cursorPos==row ? ">Alarm %d : %d:%02d %s" : " Alarm %d : %d:%02d %s",
        idx+1, a.hour, a.minute, a.enabled?"ON":"OFF");
    } else {
      strcpy(buf, "                    ");
    }
    lcd.printLine(row+1, buf);
  }

  lcd.printLine(3,
    cursorPos==3 ? ">ADD Alarm" : " ADD Alarm");
}

void DisplayAlarm::renderSensorPage() {
  char buf[21];
  float tds       = Sensor::readTDS();
  float ph        = Sensor::readPH();
  float turbidity = Sensor::readTDBT();

  lcd.printLine(0, " Sensor Monitor ");
  snprintf(buf,21,"Turbidity:%5.1f%%", turbidity);
  lcd.printLine(1, buf);
  snprintf(buf,21,"TDS      :%5.1fppm", tds);
  lcd.printLine(2, buf);
  snprintf(buf,21,"pH       :%5.1f   ", ph);
  lcd.printLine(3, buf);
}

void DisplayAlarm::readButtons() {
  if (millis() - lastDebounce < DEBOUNCE_MS) return;

  bool up    = !digitalRead(BTN_UP);
  bool down  = !digitalRead(BTN_DOWN);
  bool left  = !digitalRead(BTN_LEFT);
  bool right = !digitalRead(BTN_RIGHT);
  bool sel   = !digitalRead(BTN_SELECT);
  if (!(up||down||left||right||sel)) return;
  lastDebounce = millis();

  if (inEdit) {
    if (editField == F_TIME) {
      if (sel && !timeEditing) {
        timeEditing = true;
        timeCursor  = 0;
        return;
      }
      if (timeEditing) {
        if (up) {
          switch (timeCursor) {
            case 0: alarms[editIndex].hour   = (alarms[editIndex].hour + 1) % 24; break;
            case 1: alarms[editIndex].minute = (alarms[editIndex].minute + 1) % 60; break;
            case 2: alarms[editIndex].enabled = !alarms[editIndex].enabled;   break;
          }
        }
        if (down) {
          switch (timeCursor) {
            case 0: alarms[editIndex].hour   = (alarms[editIndex].hour + 23) % 24; break;
            case 1: alarms[editIndex].minute = (alarms[editIndex].minute + 59) % 60; break;
            case 2: alarms[editIndex].enabled = !alarms[editIndex].enabled;    break;
          }
        }
        if (left  && timeCursor > 0) timeCursor--;
        if (right && timeCursor < 2) timeCursor++;
        if (sel)   { timeEditing = false; return; }
        return;
      }
      if (up)   editField = F_DELETE;
      if (down) editField = F_DURATION;
      if (sel)  editField = F_DURATION;
      return;
    }
    else if (editField == F_DURATION) {
      if (up)   editField = F_TIME;
      if (down) editField = F_SAVE;
      if (left)  alarms[editIndex].duration = (alarms[editIndex].duration + 99) % 100;
      if (right) alarms[editIndex].duration = (alarms[editIndex].duration + 1) % 100;
      return;
    }
    else if (editField == F_SAVE) {
      if (up)   editField = F_DURATION;
      if (right) editField = F_DELETE;
      if (sel) {
        inEdit      = false;
        timeEditing = false;
        editField   = F_TIME;
        uint16_t id = alarms[editIndex].id;
        uint8_t h   = alarms[editIndex].hour;
        uint8_t m   = alarms[editIndex].minute;
        int     d   = alarms[editIndex].duration;
        bool    en  = alarms[editIndex].enabled;
        if (id == 0) publishAlarmFromESP("ADD", id, h, m, d, en);
        else         publishAlarmFromESP("EDIT", id, h, m, d, en);
        return;  // kembali ke menu utama
      }
      return;
    }
    else if (editField == F_DELETE) {
      if (left)   editField = F_SAVE;
      if (down) editField = F_TIME;
      if (sel) {
        uint16_t id = alarms[editIndex].id;
        for (uint8_t i = editIndex; i < alarmCount - 1; i++) alarms[i] = alarms[i+1];
        alarmCount--;
        inEdit      = false;
        timeEditing = false;
        editField   = F_TIME;
        pageStart   = 0;
        cursorPos   = 0;
        deleteAlarmFromESP(id);
        return;  // kembali ke menu utama
      }
      return;
    }
  }

  if (left||right) {
    currentPage = (currentPage==PAGE_ALARM ? PAGE_SENSOR : PAGE_ALARM);
    if (currentPage==PAGE_ALARM) { pageStart=0; cursorPos=0; }
    lcd.clear();
    return;
  }

  if (currentPage == PAGE_ALARM) {
    if (up) {
      if (cursorPos>0) cursorPos--;
      else if (pageStart>=2) { pageStart-=2; cursorPos=3; }
    }
    if (down) {
      if (cursorPos<3) cursorPos++;
      else if (alarmCount>pageStart+2) { pageStart+=2; cursorPos=0; }
    }
    if (sel) {
      if (cursorPos<2 && pageStart+cursorPos<alarmCount) {
        inEdit     = true;
        editIndex  = pageStart+cursorPos;
        editField  = F_TIME;
        timeEditing= false;
        timeCursor = 0;
      }
      else if (cursorPos==3 && alarmCount<MAX_ALARMS) {
        alarms[alarmCount++] = AlarmData{0,0,0,10,-1,-1,true};
        inEdit     = true;
        editIndex  = alarmCount-1;
        editField  = F_TIME;
        timeEditing= false;
        timeCursor = 0;
      }
    }
  }
}