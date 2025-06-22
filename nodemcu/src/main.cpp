#include <Arduino.h>
#include "Config.h"
#include "FileStorage.h"
#include "Network.h"
#include "ReadSensor.h"
#include "RTC.h"
#include "MQTT.h"
#include "Alarm.h"
#include "Display.h"
#include "DisplayAlarm.h" // ← Tambahkan ini

RTCHandler rtc;

// global display‐alarm handler
DisplayAlarm displayAlarm;
bool wifiEnabled = false;

char deviceId[MAX_ID_LEN + 1] = "device1";

// Maksimum kolom LCD
constexpr uint8_t LCD_COLS = 16;

// Fungsi untuk print string yang dipotong sesuai lebar LCD
void printClippedLine(uint8_t line, const String &fullText) {
    String clip = fullText;
    if (clip.length() > LCD_COLS) {
        clip = clip.substring(0, LCD_COLS);
    }
    lcd.printLine(line, clip);
}

void setup() {
    Serial.begin(115200);
    setupPins();
    initFS();
    loadAlarmsFromFS();
    loadDeviceId(deviceId, sizeof(deviceId));
    Sensor::initAllSettings();
    lcd.begin();

    // inisialisasi WiFi, RTC, MQTT, Sensor, dll.
    if (digitalRead(WIFI_MODE_PIN) == LOW) {
        // WiFi OFF
        wifiEnabled = false;
        lcd.clear();
        printClippedLine(0, "WiFi Mode: OFF");
        delay(2000);
    } else {
        // WiFi ON
        wifiEnabled = true;
        setupWiFi(deviceId, lcd);
        setupMQTT(deviceId);
        trySyncPending();
        trySyncSensorPending();
    }

    rtc.setupRTC();
    lcd.clear();
    printClippedLine(0, "Waktu: " + rtc.getTime());
    printClippedLine(1, "Tanggal: " + rtc.getDate());
    printClippedLine(2, "DevID: " + String(deviceId));

    Sensor::init();
}

void loop() {
    unsigned long nowMs = millis();

    // sampling
    static unsigned long lastSample = 0;
    if (nowMs - lastSample >= 40) {
        lastSample = nowMs;
        Sensor::sample();
    }

    // compute & publish
    static unsigned long lastCompute = 0;
    if (wifiEnabled && (nowMs - lastCompute >= 1000)) {
        lastCompute = nowMs;
        TEMPERATURE = Sensor::readTemperatureC();
        float tds = Sensor::readTDS();
        float ph = Sensor::readPH();
        float turbidity = Sensor::readTDBT();
        publishSensor(tds, ph, turbidity, TEMPERATURE);
    }

    // **Tampilkan dan kelola menu Alarm**
    displayAlarm.loop();

    // cek semua alarm (non‐blocking)
    Alarm::checkAll();

    // jalankan MQTT loop
    Sensor::checkSensorLimits();
    if (wifiEnabled) {
        loopMQTT();
    }
}
