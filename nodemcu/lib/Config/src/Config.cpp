#include "Config.h"
#include <Arduino.h>

void setupPins()
{
  // LED pin
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LED_OFF);

  // Config button
  pinMode(CONFIG_PIN, INPUT_PULLUP);

  // RTC interrupt
  pinMode(WIFI_MODE_PIN, INPUT_PULLUP);

  // I2C pins (Wire.begin will configure SDA/SCL)
  // Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  pinMode(BTN_UP, INPUT_PULLUP);
  pinMode(BTN_DOWN, INPUT_PULLUP);
  pinMode(BTN_LEFT, INPUT_PULLUP);
  pinMode(BTN_RIGHT, INPUT_PULLUP);
  pinMode(BTN_SELECT, INPUT_PULLUP);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  Serial.println("[Config] Pins initialized");
}