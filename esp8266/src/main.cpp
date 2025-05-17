#include <Arduino.h>
#include "Config.h"
#include "FileStorage.h"
#include "Network.h"
#include "Sensor.h"
#include "RTC.h"
#include "MQTT.h"
#include "Alarm.h"

char deviceId[20] = "device1";
char userId[20]   = "user1";

void setup() {
    Serial.begin(115200);
    setupPins();
    initFS();
    loadAlarmsFromFS();
    loadDeviceId(deviceId, sizeof(deviceId));
    loadUserId(userId, sizeof(userId));
    setupWiFi(deviceId, userId);
    setupRTC();
    setupMQTT(userId, deviceId);
    Sensor::init();
}

void loop() {
     static unsigned long lastSample = 0, lastCompute = 0;
  unsigned long now = millis();

  // Sampling tiap ~40 ms
  if (now - lastSample >= 40) {
    lastSample = now;
    Sensor::sample();
  }

  // Hitung & publish tiap ~800 ms
  if (now - lastCompute >= 800) {
    lastCompute = now;
    float tds = Sensor::readTDS();
    publishSensor(tds);
  }

  // modul lainnya...
  Alarm::checkAll();
  loopMQTT();
}