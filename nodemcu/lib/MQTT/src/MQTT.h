#ifndef MQTT_H
#define MQTT_H

#pragma once
#include <Arduino.h>
#include "ReadSensor.h"


void setupMQTT(const char* userId, const char* deviceId);
void loopMQTT();
void publishSensor(float tds, float ph, float turbidity, float temperature);
void publishAlarmFromESP(const char* cmd, uint16_t id, uint8_t hour, uint8_t minute, int duration, bool enabled);
void publishSensorFromESP(const SensorSetting &s);
void deleteAlarmFromESP(uint16_t id);
void trySyncPending();
void trySyncSensorPending();
void publishAllSensorSettings();
void publishMid(const char* mid, const String &payload, bool retain);

#endif // MQTT_H