#include "Network.h"
#include <WiFiManager.h>
#include <Arduino.h>

#define CONFIG_PIN 13

void setupWiFi(const char* deviceId, const char* userId) {
    WiFiManager wm;
    WiFiManagerParameter dp("device_id","Device ID",(char*)deviceId,20);
    WiFiManagerParameter up("user_id","User ID",(char*)userId,20);
    wm.addParameter(&dp);
    wm.addParameter(&up);
    if (digitalRead(CONFIG_PIN) == LOW) {
        if (!wm.startConfigPortal("ESP32_Config")) ESP.restart();
        strcpy((char*)deviceId, dp.getValue());
        strcpy((char*)userId,   up.getValue());
    } else {
        if (!wm.autoConnect()) ESP.restart();
    }
}