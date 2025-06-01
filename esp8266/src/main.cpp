#include <Arduino.h>
#include "Config.h"
#include "FileStorage.h"
#include "Network.h"
#include "ReadSensor.h"
#include "RTC.h"
#include "MQTT.h"
#include "Alarm.h"
#include "Display.h"
#include "DisplayAlarm.h"    // ← Tambahkan ini

RTCHandler rtc;

// global display‐alarm handler
DisplayAlarm displayAlarm;

char deviceId[20] = "device1";
char userId[20]   = "user1";

void setup() {
    Serial.begin(115200);
    setupPins();
    initFS();
    loadAlarmsFromFS();
    loadDeviceId(deviceId, sizeof(deviceId));
    loadUserId(userId, sizeof(userId));

    lcd.begin();

    // inisialisasi WiFi, RTC, MQTT, Sensor, dll.
    setupWiFi(deviceId, userId, lcd);
    rtc.setupRTC();
    lcd.clear();
    lcd.printLine(0, "Waktu: " + rtc.getTime());
    lcd.printLine(1, "Tanggal: " + rtc.getDate());
    setupMQTT(userId, deviceId);
    Sensor::init();
    Sensor::initAllSettings();
}

void loop() {
    unsigned long nowMs = millis();

    // update waktu/tanggal tiap detik
    // static unsigned long lastTimeUpdate = 0;
    // if (nowMs - lastTimeUpdate >= 1000) {
    //     lastTimeUpdate = nowMs;
    //     lcd.printLine(0, "Waktu: " + rtc.getTime());
    //     lcd.printLine(1, "Tanggal: " + rtc.getDate());
    // }

    // sampling
    static unsigned long lastSample = 0;
    if (nowMs - lastSample >= 40) {
        lastSample = nowMs;
        Sensor::sample();
    }

    // compute & publish
    static unsigned long lastCompute = 0;
    if (nowMs - lastCompute >= 1000) {
        lastCompute = nowMs;
        TEMPERATURE = Sensor::readTemperatureC();
        float tds       = Sensor::readTDS();
        float ph        = Sensor::readPH();
        float turbidity = Sensor::readTDBT();
        Serial.print("✅ Sensor ");
        Serial.println(TEMPERATURE);
        publishSensor(tds, ph, turbidity);
    }

    // **Tampilkan dan kelola menu Alarm**
    displayAlarm.loop();

    // cek semua alarm (non‐blocking)
    Alarm::checkAll();
    // Sensor::checkSensorLimits();
    // jalankan MQTT loop
    loopMQTT();
}
