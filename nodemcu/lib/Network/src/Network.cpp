#include "Network.h"
#include <WiFiManager.h>
#include <Arduino.h>
#include "Config.h"
#include "FileStorage.h"

static String truncateText(const String &str, uint8_t maxLen)
{
    if (str.length() <= maxLen)
        return str;
    return str.substring(0, maxLen - 1) + ".";
}

void enterConfigMode(WiFiManager &wm, WiFiManagerParameter &dp, Display &lcd)
{
    String apSSID = "ESP32_Config";
    lcd.clear();
    lcd.printLine(0, ">> Mode Config <<");
    lcd.printLine(2, "SSID : " + apSSID);
    lcd.printLine(3, "IP : 192.168.4.1");
    
    // Inisialisasi LED
    pinMode(LED_ONE, OUTPUT);
    
    // Start config portal dengan timeout 3 menit (180 detik)
    wm.setConfigPortalTimeout(180);
    
    // Jadikan non-blocking agar bisa mengontrol LED
    wm.setConfigPortalBlocking(false);
    wm.startConfigPortal(apSSID.c_str());

    // Variabel untuk kontrol kedipan LED
    unsigned long previousMillis = 0;
    const long interval = 500; // interval kedipan 500ms
    bool ledState = false;

    // Loop selama portal konfigurasi aktif
    while (wm.getConfigPortalActive()) {
        unsigned long currentMillis = millis();
        wm.process(); // Proses request config portal
        
        // Kontrol kedipan LED
        if (currentMillis - previousMillis >= interval) {
            previousMillis = currentMillis;
            ledState = !ledState;
            digitalWrite(LED_ONE, ledState ? LED_OFF : LED_ON);
        }
    }

    // Matikan LED setelah selesai
    digitalWrite(LED_ONE, LED_ON);

    if (!wm.getConfigPortalActive()) {
        lcd.clear();
        lcd.printLine(0, "Konfig Selesai");
        lcd.printLine(1, "Menyambung WiFi...");
        delay(1500);
    }
}

bool isPrintableSSID(const String &ssid)
{
    for (size_t i = 0; i < ssid.length(); i++)
    {
        char c = ssid.charAt(i);
        if (c < 32 || c > 126)
            return false; // ASCII printable range
    }
    return true;
}

void setupWiFi(char *deviceId, Display &lcd)
{
    WiFiManager wm;
    WiFiManagerParameter dp("deviceId", "Device ID", deviceId, MAX_ID_LEN);
    wm.addParameter(&dp);

    lcd.clear();
    lcd.printLine(0, "Mencoba konek WiFi");
    delay(1000);

    bool forceConfig = (digitalRead(CONFIG_PIN) == LOW);
    if (forceConfig)
    {
        enterConfigMode(wm, dp, lcd);
    }
    else
    {
        lcd.clear();
        String savedSSID = wm.getWiFiSSID(true);
        lcd.printLine(0, "AutoConnect...");
        lcd.printLine(1, "Connecting to:");
        lcd.printLine(2, (savedSSID.length() && isPrintableSSID(savedSSID)) ? truncateText(savedSSID, 16) : "-");
        
        // Tampilkan animasi titik-titik selama koneksi
        unsigned long startTime = millis();
        const unsigned long timeout = 30000; // 30 detik timeout
        uint8_t dotCount = 0;
        
        // Gunakan autoConnect versi blocking dengan timeout
        wm.setConnectTimeout(30); // Timeout 30 detik
        
        // Panggil autoConnect dengan SSID dan password kosong
        // Ini akan mencoba menyambung ke jaringan terakhir yang berhasil
        bool res = wm.autoConnect("", "");
        
        // Selama dalam proses koneksi, tampilkan animasi
        while (WiFi.status() != WL_CONNECTED && 
               WiFi.status() != WL_CONNECT_FAILED && 
               (millis() - startTime < timeout)) 
        {
            // Update animasi titik-titik setiap 500ms
            if (millis() - startTime > 500) {
                startTime = millis();
                dotCount = (dotCount + 1) % 4;
                
                String dots = "";
                for (int i = 0; i < dotCount; i++) dots += ".";
                lcd.printLine(3, "Connecting" + dots);
            }
            
            delay(10);
        }

        if (!res || WiFi.status() != WL_CONNECTED) {
            enterConfigMode(wm, dp, lcd);
        }
    }

    // *** Cuma copy & simpan kalau user memang memasukkan ID baru ***
    const char *newDev = dp.getValue();
    if (newDev && *newDev && strcmp(newDev, deviceId) != 0)
    {
        strncpy(deviceId, newDev, MAX_ID_LEN);
        deviceId[MAX_ID_LEN] = '\0';
        saveDeviceId(deviceId);
    }

    lcd.clear();
    lcd.printLine(0, "WiFi Terkoneksi");
    String ssid = truncateText(WiFi.SSID(), 16);
    lcd.printLine(1, "SSID: " + ssid);
    lcd.printLine(2, "IP: " + WiFi.localIP().toString());
    delay(3000);
}