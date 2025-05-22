#ifndef MQTT_H
#define MQTT_H

void setupMQTT(const char* userId, const char* deviceId);
void loopMQTT();
void publishSensor(float tds, float ph, float turbidity);

#endif // MQTT_H