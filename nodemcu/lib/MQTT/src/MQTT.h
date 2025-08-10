#ifndef MQTT_H
#define MQTT_H

#pragma once
#include <Arduino.h>
#include "ReadSensor.h"

void setupMQTT(const char *deviceId);
void loopMQTT();
void publishSensor(float tds, float ph, float turbidity, float temperature);
void publishAlarmFromESP(const char *cmd, uint16_t id, uint8_t hour, uint8_t minute, int duration, bool enabled);
void publishSensorFromESP(const SensorSetting &s);
void deleteAlarmFromESPByIndex(uint8_t index);
void trySyncPending();
void trySyncSensorPending();
void publishAllSensorSettings();
bool publishMessage(const char *mid, const String &payload, bool retain);
void calibrateTDSViaMQTT(float knownTDS, float temperature);

#endif // MQTT_H