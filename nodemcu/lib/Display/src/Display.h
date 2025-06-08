#ifndef DISPLAY_H
#define DISPLAY_H

#include <LiquidCrystal_I2C.h>

class Display {
public:
  Display(uint8_t address, uint8_t cols, uint8_t rows);
  void begin();
  void clear();
  void printLine(uint8_t row, const String& text);
private:
  LiquidCrystal_I2C lcd;
  uint8_t columns;
};

extern Display lcd;

#endif
