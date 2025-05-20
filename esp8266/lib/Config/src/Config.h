#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// Pin definitions
static const uint8_t LED_PIN             = 2;   // On-board LED
static const uint8_t TDS_PIN             = 36;  // ADC1_CH0
static const uint8_t CONFIG_PIN          = 13;  // Config button
static const uint8_t CLOCK_INTERRUPT_PIN = 4;   // RTC SQW interrupt
static const uint8_t I2C_SDA_PIN         = 21;
static const uint8_t I2C_SCL_PIN         = 22;
static const uint8_t TEMPERATURE         = 25.0f;

// LED states
static const uint8_t LED_ON  = HIGH;
static const uint8_t LED_OFF = LOW;

/** Initialize all pin modes and default states */
void setupPins();

#endif // CONFIG_H