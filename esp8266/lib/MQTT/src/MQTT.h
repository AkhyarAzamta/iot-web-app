#ifndef MQTT_H
#define MQTT_H

#pragma once
#include <Arduino.h>

void setupMQTT(const char* userId, const char* deviceId);
void loopMQTT();
void publishSensor(float tds, float ph, float turbidity);
void publishAlarmFromESP(const char* cmd, uint16_t id, uint8_t hour, uint8_t minute, int duration);
void deleteAlarmFromESP(uint16_t id);

#endif // MQTT_H