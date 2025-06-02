#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// Pin definitions
static const uint8_t LED_PIN             = 2;   // On-board LED
static const uint8_t CONFIG_PIN          = 16;  // Config button
static const uint8_t WIFI_MODE_PIN       = 4;   // RTC SQW interrupt
static const uint8_t I2C_SDA_PIN         = 21;
static const uint8_t I2C_SCL_PIN         = 22;
static const uint8_t TDS_PIN             = 32;  // ADC1_CH0
static const uint8_t PH_PIN              = 34; // Pin ADC ESP32
static const uint8_t TURBIDITY_PIN       = 35;    // ADC GPIO35
static const uint8_t TEMPERATURE_PIN     = 33;    // ADC GPIO35
static const uint8_t BTN_UP              = 14;
static const uint8_t BTN_DOWN            = 27;
static const uint8_t BTN_LEFT            = 25;
static const uint8_t BTN_RIGHT           = 26;
static const uint8_t BTN_SELECT          = 13;
static const uint8_t BUZZER_PIN          = 23;
static float TEMPERATURE                 = 25.0f;


// LED states
static const uint8_t LED_ON  = HIGH;
static const uint8_t LED_OFF = LOW;
extern bool wifiEnabled;


/** Initialize all pin modes and default states */
void setupPins();

#endif // CONFIG_H