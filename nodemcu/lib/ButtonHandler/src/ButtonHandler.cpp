// ButtonHandler.cpp
#include "ButtonHandler.h"
#include "Config.h"

ButtonHandler::ButtonHandler() {}

ButtonState ButtonHandler::read()
{
  ButtonState state = {false, false, false, false, false, false};

  if (millis() - lastDebounce < debounceDelay)
    return state;

  state.up = !digitalRead(BTN_UP);
  state.down = !digitalRead(BTN_DOWN);
  state.left = !digitalRead(BTN_LEFT);
  state.right = !digitalRead(BTN_RIGHT);
  state.select = !digitalRead(BTN_SELECT);
  state.anyPressed = state.up || state.down || state.left || state.right || state.select;

  if (state.anyPressed)
    lastDebounce = millis();

  return state;
}
