#include "Config.h"
#include <Arduino.h>

void setupPins() {
    // LED pin
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LED_OFF);

    // Config button
    pinMode(CONFIG_PIN, INPUT_PULLUP);

    // RTC interrupt
    pinMode(CLOCK_INTERRUPT_PIN, INPUT_PULLUP);

    // I2C pins (Wire.begin will configure SDA/SCL)
    // Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);

    Serial.println("[Config] Pins initialized");
}