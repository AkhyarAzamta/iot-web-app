// DisplayAlarm.cpp
#include "DisplayAlarm.h"
#include "MQTT.h"
#include "ReadSensor.h"
#include "ButtonHandler.h"
#include <Arduino.h>

ButtonHandler buttonHandler;

extern Display lcd;
extern RTC_DS3231 rtc;

DisplayAlarm::DisplayAlarm() {
  // Inisialisasi semua state sudah di‐set default di header (.h)
}

void DisplayAlarm::loop() {
  // 1) Ambil data alarm tiap loop
  alarms = Alarm::getAll(alarmCount);

  // 2) Ambil data sensor HANYA jika BUKAN sedang edit sensor
  if (!(inEdit && currentPage == PAGE_SENSOR)) {
    sensors = Sensor::getAllSettings(sensorCount);
  }

  // 3) Ambil current time
  DateTime now = rtc.now();

  // 4) Baca semua tombol, mungkin ubah state
  readButtons();

  // 5) Render sesuai state (alarm/sensor & inEdit/outEdit)
  renderMenu(now);
}

void DisplayAlarm::renderMenu(const DateTime &now) {
  // Clear LCD jika entry/exit edit
  if (inEdit != lastInEdit) {
    lcd.clear();
    lastInEdit = inEdit;
    Alarm::setEditing(inEdit); // memberi tahu ke Alarm subsystem kalau sedang di‐edit
  }

  if (inEdit) {
    if (currentPage == PAGE_ALARM) renderSetAlarm(now);
    else                            renderSetSensor();
  } else {
    if (currentPage == PAGE_ALARM) renderAlarmPage(now);
    else                            renderSensorPage();
  }
}

// ================================================
// renderEditPage: satu fungsi untuk edit Alarm/ Sensor
// ================================================
void DisplayAlarm::renderEditPage(
    const char* /*titleFmt*/, 
    uint8_t totalFields,
    uint8_t fieldCursor,
    bool valueEditing,
    bool isSensor
) {
  char line[21];

  // -------- Baris 0: JUDUL --------
  if (isSensor) {
    // Pilih nama sensor menurut editIndex (0=Turbidity,1=TDS,2=pH)
    const char* sensorName;
    switch (editIndex) {
      case 0: sensorName = "Turbidity"; break;
      case 1: sensorName = "TDS";       break;
      case 2: sensorName = "pH";        break;
      default: sensorName = "Sensor";   break;
    }
    snprintf(line, 21, "Edit %s", sensorName);
  }
  else {
    // Edit Alarm <nomor>
    snprintf(line, 21, "Edit Alarm %d", editIndex + 1);
  }
  lcd.printLine(0, line);

  // -------- Baris 1 & 2: Konten utama --------
  for (uint8_t f = 0; f < 2; f++) {
    // Prefix “> ” jika ini fieldCursor (dan bukan sedang valueEditing)
    const char *pfx = (!valueEditing && f == fieldCursor) ? "> " : "  ";

    if (isSensor) {
      // Get setting sensor
      auto &s = sensors[editIndex];

      if (f == 0) {
        // Baris pertama: Min|Max: xx|yy  (ditandai [ ] jika valueEditing)
        char minStr[8], maxStr[8];
        snprintf(minStr, sizeof(minStr), "%2.0f", s.minValue);
        snprintf(maxStr, sizeof(maxStr), "%2.0f", s.maxValue);
        if (valueEditing) {
          // Jika sedang edit angka, masukkan [ ] sesuai sensorCursor
          switch (sensorCursor) {
            case 0:  snprintf(minStr, sizeof(minStr), "[%2.0f]", s.minValue); break;
            case 1:  snprintf(maxStr, sizeof(maxStr), "[%2.0f]", s.maxValue); break;
          }
        }
        snprintf(line + 2, 19, "Min|Max:%s|%s", minStr, maxStr);
      }
      else {
        // Baris kedua: “Stat:ON” atau “Stat:OFF”
        snprintf(line + 2, 19, "Stat:%s", s.enabled ? "ON" : "OFF");
      }
    }
    else {
      // Jika edit Alarm
      auto &a = alarms[editIndex];
      if (f == 0 && valueEditing) {
        // Mode edit waktu: tampil [HH], [MM], [ON]
        char hourStr[8], minStr[8], onStr[8];
        snprintf(hourStr, sizeof(hourStr), "%02d", a.hour);
        snprintf(minStr,  sizeof(minStr),  "%02d", a.minute);
        snprintf(onStr,   sizeof(onStr),   "%s",  a.enabled ? "ON" : "OFF");
        switch (timeCursor) {
          case 0: snprintf(hourStr, sizeof(hourStr), "[%02d]", a.hour);   break;
          case 1: snprintf(minStr,  sizeof(minStr),  "[%02d]", a.minute); break;
          case 2: snprintf(onStr,   sizeof(onStr),   "[%s]",  a.enabled ? "ON" : "OFF"); break;
        }
        snprintf(line + 2, 19, "Time:%s:%s %s", hourStr, minStr, onStr);
      }
      else if (f == 0) {
        // Non‐edit: tampilkan “Time:HH:MM ON/OFF”
        snprintf(line + 2, 19, "Time:%02d:%02d %s",
                 a.hour, a.minute, a.enabled ? "ON" : "OFF");
      }
      else {
        // Baris kedua non‐edit: “Dur: xx s”
        snprintf(line + 2, 19, "Dur:%2ds", a.duration);
      }
    }

    // Tulis prefix (“> ”) dan konten mulai di kolom 2
    memcpy(line, pfx, 2);
    lcd.printLine(f + 1, line);
  }

  // -------- Baris 3: Footer --------
  // fieldCursor == totalFields ⇒ “> Save”
  // fieldCursor == totalFields+1 ⇒ “> Back” (sensor) atau “> Del” (alarm)
  bool selSave      = (fieldCursor == totalFields);
  bool selBackOrDel = (fieldCursor == totalFields + 1);

  String foot = selSave ? "> Save     " : "  Save     ";
  if (isSensor) {
    foot += selBackOrDel ? "> Back" : "  Back";
  } else {
    foot += selBackOrDel ? "> Del" : "  Del";
  }
  lcd.printLine(3, foot);
}

void DisplayAlarm::renderSetAlarm(const DateTime &now) {
  // Saat edit alarm, isSensor=false, totalFields=2 (Time,Duration, lalu Save,Delete)
  renderEditPage(nullptr, 2, editField, timeEditing, false);
}

void DisplayAlarm::renderSetSensor() {
  // Saat edit sensor, isSensor=true, totalFields=2 (MinMax,Status, lalu Save,Back)
  renderEditPage(nullptr, 2, editSensorField, sensorEditing, true);
}

// ================================================
// Fungsi untuk menampilkan halaman Daftar Alarm
// ================================================
void DisplayAlarm::renderAlarmPage(const DateTime &now) {
  char buf[21];
  snprintf(buf, 21, "Time: %02d:%02d:%02d",
           now.hour(), now.minute(), now.second());
  lcd.printLine(0, buf);

  // Dua baris daftar alarm (maks 2 baris per halaman)
  for (uint8_t row = 0; row < 2; row++) {
    uint8_t idx = pageStart + row;
    if (idx < alarmCount) {
      auto &a = alarms[idx];
      snprintf(buf, 21,
               cursorPos == row
                 ? ">Alarm %d: %02d:%02d %s"
                 : " Alarm %d: %02d:%02d %s",
               idx + 1,
               a.hour, a.minute,
               a.enabled ? "ON" : "OFF");
    } else {
      // Kosongkan baris jika tidak ada
      strcpy(buf, "                    ");
    }
    lcd.printLine(row + 1, buf);
  }

  // Baris ke‐3: “Add Alarm”
  lcd.printLine(3,
                cursorPos == 3 ? ">ADD Alarm" : " ADD Alarm");
}

// ================================================
// Fungsi untuk menampilkan halaman Sensor Monitor
// ================================================
void DisplayAlarm::renderSensorPage() {
  char buf[21];
  float turb = Sensor::readTDBT();
  float tds  = Sensor::readTDS();
  float ph   = Sensor::readPH();

  lcd.printLine(0, " Sensor Monitor ");

  // Baris 1: Turbidity
  const char* p0 = (cursorPos == 0) ? "> " : "  ";
  snprintf(buf, 21, "%sTurbidity:%5.1f%%", p0, turb);
  lcd.printLine(1, buf);

  // Baris 2: TDS
  const char* p1 = (cursorPos == 1) ? "> " : "  ";
  snprintf(buf, 21, "%sTDS      :%5.1fppm", p1, tds);
  lcd.printLine(2, buf);

  // Baris 3: pH
  const char* p2 = (cursorPos == 2) ? "> " : "  ";
  snprintf(buf, 21, "%spH       :%5.1f   ", p2, ph);
  lcd.printLine(3, buf);
}

// ================================================
// Baca tombol dan sesuaikan state (alarm / sensor / edit / navigasi)
// ================================================
void DisplayAlarm::readButtons() {
  ButtonState btn = buttonHandler.read();
  if (!btn.anyPressed) return;

  // -------------------------
  // 1) Editing Mode: Alarm
  // -------------------------
  if (inEdit && currentPage == PAGE_ALARM) {
    // -- Field TIME --
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
        if (btn.select) { timeEditing = false; return; }
        return;
      }
      if (btn.up)   editField = F_DELETE;
      if (btn.down) editField = F_DURATION;
      if (btn.select) editField = F_DURATION;
      return;
    }

    // -- Field DURATION --
    else if (editField == F_DURATION) {
      if (btn.up)    editField = F_TIME;
      if (btn.down)  editField = F_SAVE;
      if (btn.left)  alarms[editIndex].duration = (alarms[editIndex].duration + 99) % 100;
      if (btn.right) alarms[editIndex].duration = (alarms[editIndex].duration + 1) % 100;
      return;
    }

    // -- Field SAVE Alarm --
    else if (editField == F_SAVE) {
      if (btn.up)    editField = F_DURATION;
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
        if (id == 0) {
          // Cari ID alarm tertinggi saat ini
          uint16_t maxId = 0;
          for (int i = 0; i < alarmCount; i++) {
            if (alarms[i].id > maxId) maxId = alarms[i].id;
          }
          // ID baru = ID terbesar + 1
          uint16_t newId = maxId + 1;
          alarms[editIndex].id = newId; // set ID ke struct-nya juga
          publishAlarmFromESP("ADD", newId, h, m, d, en);
        }
        else         publishAlarmFromESP("EDIT", id, h, m, d, en);
        return;
      }
      return;
    }

    // -- Field DELETE Alarm --
    else if (editField == F_DELETE) {
      if (btn.left)   editField = F_SAVE;
      if (btn.down)   editField = F_TIME;
      if (btn.select) {
        uint16_t id = alarms[editIndex].id;
        for (uint8_t i = editIndex; i < alarmCount - 1; i++) {
          alarms[i] = alarms[i + 1];
        }
        alarmCount--;
        inEdit      = false;
        timeEditing = false;
        editField   = F_TIME;
        pageStart   = 0;
        cursorPos   = 0;
        deleteAlarmFromESP(id);
        return;
      }
      return;
    }
  }

  // -------------------------
  // 2) Editing Mode: Sensor
  // -------------------------
  if (inEdit && currentPage == PAGE_SENSOR) {
    // Field Min|Max
    if (editSensorField == F_S_MINMAX) {
      // Jika tekan SELECT dan belum editing angka → masuk mode angka
      if (btn.select && !sensorEditing) {
        sensorEditing = true;
        sensorCursor  = 0;
        return;
      }

      // Jika dalam mode angka editing
      if (sensorEditing) {
        float &v = (sensorCursor == 0)
                     ? sensors[editIndex].minValue
                     : sensors[editIndex].maxValue;
        if (btn.up)   v += 1.0f;
        if (btn.down) v -= 1.0f;
        if (v < 0.0f) v = 0.0f;  // jangan negative

        if (btn.left  && sensorCursor > 0) sensorCursor--;
        if (btn.right && sensorCursor < 1) sensorCursor++;
        if (btn.select) {
          sensorEditing = false;
          return;
        }
        return;
      }

      // Bukan mode angka → navigasi field‐nya
      if (btn.up)    editSensorField = F_S_BACK;    // pindah ke “Back”
      if (btn.down)  editSensorField = F_S_STATUS;  // pindah ke “Status”
      if (btn.select)editSensorField = F_S_SAVE;    // pindah ke “Save”
      return;
    }

    // Field Status (ON/OFF)
    else if (editSensorField == F_S_STATUS) {
      if (btn.left || btn.right) {
        sensors[editIndex].enabled = !sensors[editIndex].enabled;
      }
      if (btn.up)   editSensorField = F_S_MINMAX;
      if (btn.down) editSensorField = F_S_SAVE;
      return;
    }

    // Field Save (commit ke LittleFS)
    else if (editSensorField == F_S_SAVE) {
      if (btn.up)    editSensorField = F_S_STATUS;
      if (btn.right) editSensorField = F_S_BACK;
      if (btn.select) {
        publishSensorFromESP(sensors[editIndex]);
        inEdit          = false;
        sensorEditing   = false;
        editSensorField = F_S_MINMAX;
      }
      return;
    }

    // Field Back (cancel)
    else if (editSensorField == F_S_BACK) {
      if (btn.left)  editSensorField = F_S_SAVE;
      if (btn.down)  editSensorField = F_S_MINMAX;
      if (btn.select) {
        // Keluar tanpa simpan
        inEdit          = false;
        sensorEditing   = false;
        editSensorField = F_S_MINMAX;
      }
      return;
    }
  }

  // -------------------------
  // 3) Navigasi Antar‐halaman
  // -------------------------
  if (btn.left || btn.right) {
    currentPage = (currentPage == PAGE_ALARM ? PAGE_SENSOR : PAGE_ALARM);
    inEdit      = false;
    lcd.clear();
    return;
  }

  // -------------------------
  // 4) Navigasi & Entri EDIT di Alarm Page
  // -------------------------
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
        inEdit      = true;
        editIndex   = pageStart + cursorPos;
        editField   = F_TIME;
        timeEditing = false;
        timeCursor  = 0;
      }
      else if (cursorPos == 3 && alarmCount < MAX_ALARMS) {
        alarms[alarmCount++] = AlarmData{0, 0, 0, 10, -1, -1, true};
        inEdit      = true;
        editIndex   = alarmCount - 1;
        editField   = F_TIME;
        timeEditing = false;
        timeCursor  = 0;
      }
    }
    return;
  }

  // -------------------------
  // 5) Navigasi & Entri EDIT di Sensor Page
  // -------------------------
  if (currentPage == PAGE_SENSOR && !inEdit) {
    if (btn.up && cursorPos > 0)       cursorPos--;
    if (btn.down && cursorPos < 2)     cursorPos++;
    if (btn.select) {
      inEdit           = true;
      editIndex        = cursorPos;   // 0=Turbidity,1=TDS,2=pH
      editSensorField  = F_S_MINMAX;
      sensorEditing    = false;
      sensorCursor     = 0;
    }
    return;
  }
}
