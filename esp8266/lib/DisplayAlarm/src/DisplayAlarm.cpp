#include "DisplayAlarm.h"

// Global instances
extern Display lcd;
extern RTC_DS3231 rtc;

DisplayAlarm::DisplayAlarm() {}


void DisplayAlarm::loop() {
  DateTime now = rtc.now();
  readButtons();
  renderMenu(now);
  if (!inEdit) {
    checkAlarms(now);
  }
}

void DisplayAlarm::renderMenu(const DateTime &now) {
  // clear once on mode change
  if (inEdit != lastInEdit) {
    lcd.clear();
    lastInEdit = inEdit;
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
      if (sel && !timeEditing) {
        timeEditing = true;
        timeCursor  = 0;
      } else if (timeEditing) {
        if (up) {
          if (timeCursor == 0) alarms[editIndex].hour++;
          else if (timeCursor == 1) alarms[editIndex].minute++;
          else alarms[editIndex].enabled = !alarms[editIndex].enabled;
        }
        if (down) {
          if (timeCursor == 0) alarms[editIndex].hour--;
          else if (timeCursor == 1) alarms[editIndex].minute--;
          else alarms[editIndex].enabled = !alarms[editIndex].enabled;
        }
        if (left  && timeCursor > 0) timeCursor--;
        if (right && timeCursor < 2) timeCursor++;
        if (sel) timeEditing = false;
        // wrap hour/minute/status
        alarms[editIndex].hour   %= 24;
        alarms[editIndex].minute %= 60;
      } else {
        if (up)   editField = F_DELETE;
        if (down) editField = F_DURATION;
        if (sel)  editField = F_DURATION;
      }
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
        Alarm::add(0, alarms[editIndex].hour, alarms[editIndex].minute, alarms[editIndex].duration);
      }
    }
    // DELETE field
    else if (editField == F_DELETE) {
      if (up)   editField = F_SAVE;
      if (down) editField = F_TIME;
      if (sel) {
        // remove alarm
        for (uint8_t i = editIndex; i < alarmCount - 1; i++)
          alarms[i] = alarms[i + 1];
        alarmCount--;
        inEdit      = false;
        timeEditing = false;
        editField   = F_TIME;
        pageStart   = 0;
        cursorPos   = 0;
        Alarm::remove(editIndex);
      }
    }
  }
  else {
    // MAIN navigation
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
        alarms[alarmCount++] = {0, 0, 10, true};
        inEdit      = true;
        editIndex   = alarmCount - 1;
        editField   = F_TIME;
        timeEditing = false;
        timeCursor  = 0;
      }
    }
  }
}

void DisplayAlarm::checkAlarms(const DateTime &now) {
  static bool triggered[MAX_ALARMS] = {false};
  for (uint8_t i = 0; i < alarmCount; i++) {
    if (alarms[i].enabled
     && now.hour()   == alarms[i].hour
     && now.minute() == alarms[i].minute
     && now.second() == 0
     && !triggered[i]) {
      triggered[i] = true;
      lcd.clear();
      lcd.printLine(1, "!!! ALARM !!!");
      unsigned long t0 = millis();
      while (millis() - t0 < alarms[i].duration * 1000UL)
        digitalWrite(BUZZER_PIN, (millis() % 500) < 250);
      digitalWrite(BUZZER_PIN, LOW);
    }
    if (now.second() > 0) triggered[i] = false;
  }
}
