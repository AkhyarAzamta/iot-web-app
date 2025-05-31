// DisplayAlarm.cpp
#include "DisplayAlarm.h"
#include "MQTT.h"
#include "ReadSensor.h"
#include "ButtonHandler.h"

ButtonHandler buttonHandler;

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

void DisplayAlarm::renderEditPage(
    const char* /*titleFmt*/,
    uint8_t totalFields,
    uint8_t fieldCursor,
    bool valueEditing,
    bool isSensor
) {
  char line[21];

  // ============================
  // Baris 0: JUDUL
  // ============================
  if (isSensor) {
    // Kita pakai editIndex (0,1,2) untuk menentukan nama sensor:
    const char* sensorName;
    switch (editIndex) {
      case 0:   sensorName = "Turbidity"; break;
      case 1:   sensorName = "TDS";       break;
      case 2:   sensorName = "pH";        break;
      default:  sensorName = "Sensor";    break;
    }
    // Tampilkan: "Edit <nama_sensor>"
    snprintf(line, 21, "Edit %s", sensorName);
  }
  else {
    // Jika bukan sensor (alias alarm), tetap "Edit Alarm <nomor>"
    snprintf(line, 21, "Edit Alarm %d", editIndex + 1);
  }
  lcd.printLine(0, line);

  // ============================
  // Baris 1 & 2: KONTEN UTAMA
  // ============================
  for (uint8_t f = 0; f < 2; f++) {
    const char *pfx = (!valueEditing && f == fieldCursor) ? "> " : "  ";
    if (isSensor) {
      // Ambil struct sensor (namun hanya untuk min/max & status)
      auto &s = sensors[editIndex];
      if (f == 0) {
        // Baris pertama: "Min|Max: xx|yy"
        char minStr[6], maxStr[6];
        snprintf(minStr, sizeof(minStr), "%2.0f", s.minValue);
        snprintf(maxStr, sizeof(maxStr), "%2.0f", s.maxValue);
        if (valueEditing) {
          switch (sensorCursor) {
            case 0:
              snprintf(minStr, sizeof(minStr), "[%2.0f]", s.minValue);
              break;
            case 1:
              snprintf(maxStr, sizeof(maxStr), "[%2.0f]", s.maxValue);
              break;
          }
        }
        snprintf(line + 2, 19, "Min|Max:%s|%s", minStr, maxStr);
      }
      else {
        // Baris kedua: "Stat:ON" atau "Stat:OFF"
        snprintf(line + 2, 19, "Stat:%s", s.enabled ? "ON" : "OFF");
      }
    }
    else {
      // Jika alarm
      auto &a = alarms[editIndex];
      if (f == 0 && valueEditing) {
        // Saat edit waktu (menampilkan [HH], [MM], atau [ON]/[OFF])
        char hourStr[6], minStr[6], onStr[6];
        snprintf(hourStr, sizeof(hourStr), "%02d", a.hour);
        snprintf(minStr,  sizeof(minStr),  "%02d", a.minute);
        snprintf(onStr,   sizeof(onStr),   "%s",  a.enabled ? "ON" : "OFF");
        switch (timeCursor) {
          case 0:
            snprintf(hourStr, sizeof(hourStr), "[%02d]", a.hour);
            break;
          case 1:
            snprintf(minStr, sizeof(minStr), "[%02d]", a.minute);
            break;
          case 2:
            snprintf(onStr,  sizeof(onStr),  "[%s]", a.enabled ? "ON" : "OFF");
            break;
        }
        snprintf(line + 2, 19, "Time:%s:%s %s", hourStr, minStr, onStr);
      }
      else if (f == 0) {
        // Baris pertama non‐editing: "Time:HH:MM ON/OFF"
        snprintf(line + 2, 19, "Time:%02d:%02d %s",
                 a.hour, a.minute, a.enabled ? "ON" : "OFF");
      }
      else {
        // Baris kedua non‐editing: "Dur: xx s"
        snprintf(line + 2, 19, "Dur:%2ds", a.duration);
      }
    }

    // Push prefix (“> ”) lalu cetak ke baris (f+1)
    memcpy(line, pfx, 2);
    lcd.printLine(f + 1, line);
  }

  // ============================
  // Baris 3: FOOTER (“Save / Back” atau “Save / Del”)
  // ============================
  bool selSave      = (fieldCursor == totalFields);
  bool selBackOrDel = (fieldCursor == totalFields + 1);

  // Kolom kiri selalu “Save”
  String foot = selSave ? "> Save     " : "  Save     ";
  if (isSensor) {
    // Untuk sensor: tombol kedua adalah “Back”
    foot += selBackOrDel ? "> Back" : "  Back";
  } else {
    // Untuk alarm: tombol kedua adalah “Del”
    foot += selBackOrDel ? "> Del" : "  Del";
  }
  lcd.printLine(3, foot);
}


void DisplayAlarm::renderSetAlarm(const DateTime &now) {
  // Saat edit alarm, isSensor = false
  renderEditPage(nullptr, 2, editField, timeEditing, false);
}

void DisplayAlarm::renderSetSensor() {
  // Saat edit sensor, isSensor = true
  renderEditPage(nullptr, 2, editSensorField, sensorEditing, true);
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
  ButtonState btn = buttonHandler.read();
  if (!btn.anyPressed) return;

  // -- Editing mode (alarm) --
  if (inEdit && currentPage==PAGE_ALARM) {
    if (editField == F_TIME) {
      if (btn.select && !timeEditing) {
        timeEditing = true;
        timeCursor  = 0;
        return;
      }
      if (timeEditing) {
        if (btn.up) {
          switch (timeCursor) {
            case 0: alarms[editIndex].hour   = (alarms[editIndex].hour + 1) % 24; break;
            case 1: alarms[editIndex].minute = (alarms[editIndex].minute + 1) % 60; break;
            case 2: alarms[editIndex].enabled = !alarms[editIndex].enabled;   break;
          }
        }
        if (btn.down) {
          switch (timeCursor) {
            case 0: alarms[editIndex].hour   = (alarms[editIndex].hour + 23) % 24; break;
            case 1: alarms[editIndex].minute = (alarms[editIndex].minute + 59) % 60; break;
            case 2: alarms[editIndex].enabled = !alarms[editIndex].enabled;    break;
          }
        }
        if (btn.left  && timeCursor > 0) timeCursor--;
        if (btn.right && timeCursor < 2) timeCursor++;
        if (btn.select)   { timeEditing = false; return; }
        return;
      }
      if (btn.up)   editField = F_DELETE;
      if (btn.down) editField = F_DURATION;
      if (btn.select)  editField = F_DURATION;
      return;
    }
    else if (editField == F_DURATION) {
      if (btn.up)   editField = F_TIME;
      if (btn.down) editField = F_SAVE;
      if (btn.left)  alarms[editIndex].duration = (alarms[editIndex].duration + 99) % 100;
      if (btn.right) alarms[editIndex].duration = (alarms[editIndex].duration + 1) % 100;
      return;
    }
    else if (editField == F_SAVE) {
      if (btn.up)   editField = F_DURATION;
      if (btn.right) editField = F_DELETE;
      if (btn.select) {
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
      if (btn.left)   editField = F_SAVE;
      if (btn.down) editField = F_TIME;
      if (btn.select) {
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
      if (btn.select && !sensorEditing) {
        sensorEditing = true;
        sensorCursor  = 0;
        return;
      }
      if (sensorEditing) {
        if (btn.up || btn.down) {
          float &v = (sensorCursor == 0)
                     ? sensors[editIndex].minValue
                     : sensors[editIndex].maxValue;
          v += btn.up ? 1.0f : -1.0f;
        }
        if (btn.left  && sensorCursor > 0) sensorCursor--;
        if (btn.right && sensorCursor < 1) sensorCursor++;
        if (btn.select) { sensorEditing = false; return; }
        return;
      }
      if (btn.up)   editSensorField = F_S_DELETE;
      if (btn.down) editSensorField = F_S_STATUS;
      if (btn.select)  editSensorField = F_S_SAVE;
      return;
    }
    else if (editSensorField == F_S_STATUS) {
      if (btn.left || btn.right) {
        sensors[editIndex].enabled = !sensors[editIndex].enabled;
      }
      if (btn.up)   editSensorField = F_S_MINMAX;
      if (btn.down)   editSensorField = F_S_SAVE;
      return;
    }
    else if (editSensorField == F_S_SAVE) {
      if (btn.up)   editSensorField = F_S_STATUS;
      if (btn.right)   editSensorField = F_S_DELETE;
      if (btn.select) {
        inEdit         = false;
        sensorEditing  = false;
        editSensorField = F_S_MINMAX;
        Sensor::saveAllSettings();
      }
      return;
    }
    else if (editSensorField == F_S_DELETE) {
      if (btn.left)   editSensorField = F_S_SAVE;
      if (btn.down) editSensorField = F_S_MINMAX;
      if (btn.select) {
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
  if (btn.left||btn.right) {
    currentPage = (currentPage==PAGE_ALARM ? PAGE_SENSOR : PAGE_ALARM);
    inEdit = false;
    lcd.clear();
    return;
  }

 // 4) Navigasi & masuk edit di Alarm page
  if (currentPage == PAGE_ALARM && !inEdit) {
    if (btn.up) {
      if (cursorPos > 0) cursorPos--;
      else if (pageStart >= 2) { pageStart -= 2; cursorPos = 3; }
    }
    if (btn.down) {
      if (cursorPos < 3) cursorPos++;
      else if (alarmCount > pageStart + 2) { pageStart += 2; cursorPos = 0; }
    }
    if (btn.select) {
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
    if (btn.up && cursorPos > 0)       cursorPos--;
    if (btn.down && cursorPos < 3) cursorPos++;
    if (btn.select) {
      inEdit          = true;
      editIndex       = cursorPos;       // pilih sensor ke-cursorPos
      editSensorField = F_S_MINMAX;
      sensorEditing   = false;
      sensorCursor    = 0;
    }
    return;
  }
}

