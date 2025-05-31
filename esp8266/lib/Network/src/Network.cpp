#include "Network.h"
#include <WiFiManager.h>
#include <Arduino.h>
#include "Config.h"

static String truncateText(const String &str, uint8_t maxLen) {
  if (str.length() <= maxLen) return str;
  return str.substring(0, maxLen - 1) + ".";
}

void enterConfigMode(WiFiManager& wm, WiFiManagerParameter& dp, WiFiManagerParameter& up, Display& lcd) {
    lcd.clear();
    lcd.printLine(0, ">> Mode Config <<");

    String apSSID = "ESP32_Config";

    lcd.printLine(1, "AP SSID:");
    lcd.printLine(2, apSSID);
    delay(2000);

    if (!wm.startConfigPortal(apSSID.c_str())) {
        lcd.clear();
        lcd.printLine(0, "Gagal masuk config");
        delay(3000);
        ESP.restart();
    }

    lcd.clear();
    lcd.printLine(0, "Konfig Selesai");
    lcd.printLine(1, "Menyambung WiFi...");
    delay(1500);
}
bool isPrintableSSID(const String& ssid) {
    for (size_t i = 0; i < ssid.length(); i++) {
        char c = ssid.charAt(i);
        if (c < 32 || c > 126) return false; // ASCII printable range
    }
    return true;
}
void setupWiFi(char* deviceId, char* userId, Display& lcd) {
    WiFiManager wm;
    WiFiManagerParameter dp("device_id", "Device ID", deviceId, 20);
    WiFiManagerParameter up("user_id", "User ID", userId, 20);
    wm.addParameter(&dp);
    wm.addParameter(&up);

    lcd.clear();
    lcd.printLine(0, "Mencoba konek WiFi");
    delay(1000);

    bool forceConfig = (digitalRead(CONFIG_PIN) == LOW);
    if (forceConfig) {
        enterConfigMode(wm, dp, up, lcd);
    } else {
        lcd.clear();
        lcd.printLine(0, "AutoConnect...");
        delay(500);

        String savedSSID = wm.getWiFiSSID(true);
        lcd.printLine(1, "Connecting to:");
        if (savedSSID.length() > 0 && isPrintableSSID(savedSSID)) {
            lcd.printLine(2, truncateText(savedSSID, 16));
        } else {
            lcd.printLine(2, "-");
        }

        delay(2000);

        if (!wm.autoConnect()) {
            enterConfigMode(wm, dp, up, lcd);
        }
    }

    // Simpan hasil konfigurasi
    strcpy(deviceId, dp.getValue());
    strcpy(userId,   up.getValue());

    lcd.clear();
    lcd.printLine(0, "WiFi Terkoneksi");
    String ssid = truncateText(WiFi.SSID(), 16);
    lcd.printLine(1, "SSID: " + ssid);
    lcd.printLine(2, "IP: " + WiFi.localIP().toString());
    delay(3000);
}
