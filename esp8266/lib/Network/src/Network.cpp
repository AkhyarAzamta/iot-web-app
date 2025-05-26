// Network.cpp
#include "Network.h"
#include <WiFiManager.h>
#include <Arduino.h>
#include "Config.h"

void setupWiFi(const char* deviceId, const char* userId, Display& lcd) {
    WiFiManager wm;
    WiFiManagerParameter dp("device_id", "Device ID", (char*)deviceId, 20);
    WiFiManagerParameter up("user_id", "User ID", (char*)userId, 20);
    wm.addParameter(&dp);
    wm.addParameter(&up);

    lcd.printLine(0, "Mencoba konek WiFi");

    if (digitalRead(CONFIG_PIN) == LOW) {
        lcd.printLine(1, "Mode Konfigurasi");
        if (!wm.startConfigPortal("ESP32_Config")) {
            lcd.printLine(2, "Gagal masuk config");
            delay(3000);
            ESP.restart();
        }

        strcpy((char*)deviceId, dp.getValue());
        strcpy((char*)userId,   up.getValue());
        lcd.printLine(2, "Konfigurasi OK");
    } else {
        lcd.printLine(1, "Auto connect...");
        if (!wm.autoConnect()) {
            lcd.printLine(2, "Koneksi gagal!");
            delay(3000);
            ESP.restart();
        }
    }
    String currentSSID = WiFi.SSID();

    lcd.printLine(2, "WiFi Terkoneksi ke: "  + currentSSID);
    lcd.printLine(3, WiFi.localIP().toString());
}
