#include "Network.h"
#include <WiFiManager.h>
#include <Arduino.h>
#include "Config.h"
#include "FileStorage.h"

static String truncateText(const String &str, uint8_t maxLen) {
  if (str.length() <= maxLen) return str;
  return str.substring(0, maxLen - 1) + ".";
}

void enterConfigMode(WiFiManager& wm, WiFiManagerParameter& dp, WiFiManagerParameter& up, Display& lcd) {
    String apSSID = "ESP32_Config";
    lcd.clear();
    lcd.printLine(0, ">> Mode Config <<");
    lcd.printLine(2, "SSID : " + apSSID);
    lcd.printLine(3, "IP : 192.168.4.1");
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
    // Gunakan nilai awal deviceId/userId yang sudah diload dari FS (atau default)
    WiFiManagerParameter dp("deviceId", "Device ID", deviceId, MAX_ID_LEN);
    WiFiManagerParameter up("userId",   "User ID",   userId,   MAX_ID_LEN);
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
        lcd.printLine(2,
            (savedSSID.length() && isPrintableSSID(savedSSID))
            ? truncateText(savedSSID, 16)
            : "-"
        );
        delay(2000);

        if (!wm.autoConnect()) {
            enterConfigMode(wm, dp, up, lcd);
        }
    }

    // *** Cuma copy & simpan kalau user memang memasukkan ID baru ***
   // ambil nilai baru
    const char* newDev  = dp.getValue();
    const char* newUser = up.getValue();

    // hanya simpan kalau memang berbeda dan tidak kosong
    if (newDev && *newDev && strcmp(newDev, deviceId) != 0) {
        // salin sampai MAX_ID_LEN karakter + '\0'
        strncpy(deviceId, newDev, MAX_ID_LEN);
        deviceId[MAX_ID_LEN] = '\0';
        saveDeviceId(deviceId);
        Serial.printf("[FS] deviceId updated to '%s'\n", deviceId);
    }

    if (newUser && *newUser && strcmp(newUser, userId) != 0) {
        strncpy(userId, newUser, MAX_ID_LEN);
        userId[MAX_ID_LEN] = '\0';
        saveUserId(userId);
        Serial.printf("[FS] userId   updated to '%s'\n", userId);
    }

    lcd.clear();
    lcd.printLine(0, "WiFi Terkoneksi");
    String ssid = truncateText(WiFi.SSID(), 16);
    lcd.printLine(1, "SSID: " + ssid);
    lcd.printLine(2, "IP: " + WiFi.localIP().toString());
    delay(3000);
}
