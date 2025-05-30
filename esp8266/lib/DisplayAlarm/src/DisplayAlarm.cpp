// DisplayAlarm.cpp
#include "DisplayAlarm.h"
#include "MQTT.h"
#include "ReadSensor.h"

extern Display lcd;
extern RTC_DS3231 rtc;

DisplayAlarm::DisplayAlarm() {}

void DisplayAlarm::loop() {
  // ambil data tiap loop
  alarms  = Alarm::getAll(alarmCount);
  sensors = Sensor::getAllSettings(sensorCount);
  DateTime now = rtc.now();

  readButtons();
  renderMenu(now);
}

void DisplayAlarm::renderMenu(const DateTime &now) {
  // clear screen saat masuk/keluar edit
  if (inEdit != lastInEdit) {
    lcd.clear();
    lastInEdit = inEdit;
    Alarm::setEditing(inEdit);
  }

  if (inEdit) {
    if (currentPage == PAGE_ALARM) renderSetAlarm(now);
    else                            renderSetSensor();
  } else {
    if (currentPage == PAGE_ALARM) renderAlarmPage(now);
    else                            renderSensorPage();
  }
}

void DisplayAlarm::renderEditPage(const char* titleFmt,uint8_t totalFields,uint8_t fieldCursor,bool valueEditing,bool isSensor){
  char line[21];
  // Baris 0: judul
  snprintf(line,21, titleFmt, editIndex+1);
  lcd.printLine(0, line);
  // Baris 1 & 2: dua field utama
  for(uint8_t f=0; f<2; f++){
    // prefix ">" jika ini cursor (dan bukan dalam angka editing)
    const char *pfx = (!valueEditing && f==fieldCursor) ? "> " : "  ";
    if (isSensor) {
      auto &s = sensors[editIndex];
      if (f==0) snprintf(line+2, 19, "Min|Max:%2.0f|%2.0f", s.minValue, s.maxValue);
      else      snprintf(line+2, 19, "Stat:%s", s.enabled?"ON":"OFF");
    } else {
      auto &a = alarms[editIndex];
      if (f == 0 && valueEditing) {
        // Tampilkan Time dengan [hour], [minute], atau [ON] saat sedang diedit
        char hourStr[6], minStr[6], onStr[6];

        snprintf(hourStr, sizeof(hourStr), "%02d", a.hour);
        snprintf(minStr, sizeof(minStr), "%02d", a.minute);
        snprintf(onStr,  sizeof(onStr),  "%s",  a.enabled ? "ON" : "OFF");

        // Tambahkan [] di posisi cursor timeCursor
        switch (timeCursor) {
          case 0: snprintf(hourStr, sizeof(hourStr), "[%02d]", a.hour); break;
          case 1: snprintf(minStr,  sizeof(minStr),  "[%02d]", a.minute); break;
          case 2: snprintf(onStr,   sizeof(onStr),   "[%s]",  a.enabled ? "ON" : "OFF"); break;
        }

        snprintf(line+2, 19, "Time:%s:%s %s", hourStr, minStr, onStr);
      }
      else if (f == 0) {
        snprintf(line+2, 19, "Time:%02d:%02d %s",
                 a.hour, a.minute, a.enabled ? "ON" : "OFF");
      }
      else {
        snprintf(line+2, 19, "Dur:%2ds", a.duration);
      }
    }
    // print line
    memcpy(line, pfx, 2);
    lcd.printLine(f+1, line);
  }

  // Baris 3: Save / Delete
  bool selSave = fieldCursor == totalFields;
  bool selDel  = fieldCursor == totalFields+1;
  String foot = selSave ? "> Save     " : "  Save     ";
  foot += selDel ? "> Del" : "  Del";
  lcd.printLine(3, foot);
}

void DisplayAlarm::renderSetAlarm(const DateTime &now) {
  renderEditPage("Edit Alarm %d", 2, editField, timeEditing, false);
}

void DisplayAlarm::renderSetSensor() {
  renderEditPage("Edit Sensor %d", 2, editSensorField, sensorEditing, true);
}

void DisplayAlarm::renderAlarmPage(const DateTime &now) {
  char buf[21];
  snprintf(buf,21,"Time: %02d:%02d:%02d",
           now.hour(), now.minute(), now.second());
  lcd.printLine(0, buf);

  // dua baris daftar alarm
  for(uint8_t row=0; row<2; row++){
    uint8_t idx = pageStart + row;
    if (idx < alarmCount) {
      auto &a = alarms[idx];
      snprintf(buf,21,
        cursorPos==row ? ">Alarm %d: %02d:%02d %s"
                       : " Alarm %d: %02d:%02d %s",
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
  float turb = Sensor::readTDBT();
  float tds  = Sensor::readTDS();
  float ph   = Sensor::readPH();

  lcd.printLine(0, " Sensor Monitor ");

  // Baris 1: Turbidity
  const char* p0 = (cursorPos == 0) ? "> " : "  ";
  snprintf(buf,21,"%sTurbidity:%5.1f%%", p0, turb);
  lcd.printLine(1, buf);

  // Baris 2: TDS
  const char* p1 = (cursorPos == 1) ? "> " : "  ";
  snprintf(buf,21,"%sTDS      :%5.1fppm", p1, tds);
  lcd.printLine(2, buf);

  // Baris 3: pH
  const char* p2 = (cursorPos == 2) ? "> " : "  ";
  snprintf(buf,21,"%spH       :%5.1f   ", p2, ph);
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

  // -- Editing mode (alarm) --
  if (inEdit && currentPage==PAGE_ALARM) {
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
  // -- Editing mode (sensor) --
  if (inEdit && currentPage == PAGE_SENSOR) {
    // -- untuk simplicity hanya 2 field: MinMax dan Status --
    if (editSensorField == F_S_MINMAX) {
      if (sel && !sensorEditing) {
        sensorEditing = true;
        sensorCursor  = 0;
        return;
      }
      if (sensorEditing) {
        if (up || down) {
          float &v = (sensorCursor == 0)
                     ? sensors[editIndex].minValue
                     : sensors[editIndex].maxValue;
          v += up ? 1.0f : -1.0f;
        }
        if (left  && sensorCursor > 0) sensorCursor--;
        if (right && sensorCursor < 1) sensorCursor++;
        if (sel) { sensorEditing = false; return; }
        return;
      }
      if (up)   editSensorField = F_S_DELETE;
      if (down) editSensorField = F_S_STATUS;
      if (sel)  editSensorField = F_S_SAVE;
      return;
    }
    else if (editSensorField == F_S_STATUS) {
      if (left || right) {
        sensors[editIndex].enabled = !sensors[editIndex].enabled;
      }
      if (up)   editSensorField = F_S_MINMAX;
      if (down)   editSensorField = F_S_SAVE;
      return;
    }
    else if (editSensorField == F_S_SAVE) {
      if (up)   editSensorField = F_S_STATUS;
      if (right)   editSensorField = F_S_DELETE;
      if (sel) {
        inEdit         = false;
        sensorEditing  = false;
        editSensorField = F_S_MINMAX;
        Sensor::saveAllSettings();
      }
      return;
    }
    else if (editSensorField == F_S_DELETE) {
      if (left)   editSensorField = F_S_SAVE;
      if (down) editSensorField = F_S_MINMAX;
      if (sel) {
        uint16_t id = sensors[editIndex].id;
        for (uint8_t i = editIndex; i < alarmCount - 1; i++) sensors[i] = sensors[i+1];
        alarmCount--;
        inEdit      = false;
        sensorEditing = false;
        editSensorField   = F_S_MINMAX;
        pageStart   = 0;
        cursorPos   = 0;
        deleteAlarmFromESP(id);
        return;  // kembali ke menu utama
      }
      return;
    }
  }

  // navigasi page
  if (left||right) {
    currentPage = (currentPage==PAGE_ALARM ? PAGE_SENSOR : PAGE_ALARM);
    inEdit = false;
    lcd.clear();
    return;
  }

 // 4) Navigasi & masuk edit di Alarm page
  if (currentPage == PAGE_ALARM && !inEdit) {
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
        inEdit     = true;
        editIndex  = pageStart + cursorPos;
        editField  = F_TIME;
        timeEditing= false;
        timeCursor = 0;
      }
      else if (cursorPos == 3 && alarmCount < MAX_ALARMS) {
        alarms[alarmCount++] = AlarmData{0,0,0,10,-1,-1,true};
        inEdit     = true;
        editIndex  = alarmCount - 1;
        editField  = F_TIME;
        timeEditing= false;
        timeCursor = 0;
      }
    }
    return;
  }

  // 5) Navigasi & masuk edit di Sensor page
  if (currentPage == PAGE_SENSOR && !inEdit) {
    // sensorCount=3 (Turbidity,TDS,pH)
    if (up && cursorPos > 0)       cursorPos--;
    if (down && cursorPos < 3) cursorPos++;
    if (sel) {
      inEdit          = true;
      editIndex       = cursorPos;       // pilih sensor ke-cursorPos
      editSensorField = F_S_MINMAX;
      sensorEditing   = false;
      sensorCursor    = 0;
    }
    return;
  }
}

