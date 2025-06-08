// ButtonHandler.h
#ifndef BUTTON_HANDLER_H
#define BUTTON_HANDLER_H

#include <Arduino.h>

struct ButtonState {
  bool up;
  bool down;
  bool left;
  bool right;
  bool select;
  bool anyPressed;
};

class ButtonHandler {
public:
  ButtonHandler();
  ButtonState read();
private:
  unsigned long lastDebounce = 0;
  const unsigned long debounceDelay = 200;
};

#endif
