#include "Config.h"
#include <Arduino.h>

#define LED_PIN       2
#define CONFIG_PIN   13

void setupPins() {
    pinMode(LED_PIN, OUTPUT);
    pinMode(CONFIG_PIN, INPUT_PULLUP);
    digitalWrite(LED_PIN, HIGH);
    Serial.println("[Config] Pins initialized: LED on GPIO2, CONFIG on GPIO13");

}