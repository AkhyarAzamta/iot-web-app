#include "Display.h"

Display lcd(0x27, 20, 4);

Display::Display(uint8_t address, uint8_t cols, uint8_t rows)
  : lcd(address, cols, rows), columns(cols) {}

void Display::begin() {
  lcd.init();
  lcd.backlight();
}

void Display::clear() {
  lcd.clear();
}

void Display::printLine(uint8_t row, const String& text) {
  lcd.setCursor(0, row);
  lcd.print(text);
  for (uint8_t i = text.length(); i < columns; i++) {
    lcd.print(' ');
  }
}
