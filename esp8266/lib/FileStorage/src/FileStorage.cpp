#include "FileStorage.h"
#include <LittleFS.h>
#include "Alarm.h"
#include <Arduino.h>

static const char* ALARM_FILE    = "/alarms.bin";
static const char* DEVICEID_FILE = "/deviceid.txt";
static const char* USERID_FILE   = "/userid.txt";

void initFS() {
    if (!LittleFS.begin(true)) {
        Serial.println("[FS] Mount failed");
        while (1) delay(1000);
    }
        Serial.println("[FS] Mounted successfully.");

}

void saveAlarmsToFS() { Alarm::saveAll(); }
void loadAlarmsFromFS() {  Alarm::loadAll(); }

void saveDeviceId(const char* id) {
    File f = LittleFS.open(DEVICEID_FILE, "w");
    if (f) { f.print(id); f.close(); }
}

void loadDeviceId(char* id, size_t len) {
    if (!LittleFS.exists(DEVICEID_FILE)) return;
    File f = LittleFS.open(DEVICEID_FILE, "r");
    if (f) {
        size_t r = f.readBytes(id, len - 1);
        id[r] = '\0';
        f.close();
    }
}

void saveUserId(const char* id) {
    File f = LittleFS.open(USERID_FILE, "w");
    if (f) { f.print(id); f.close(); }
}

void loadUserId(char* id, size_t len) {
    if (!LittleFS.exists(USERID_FILE)) return;
    File f = LittleFS.open(USERID_FILE, "r");
    if (f) {
        size_t r = f.readBytes(id, len - 1);
        id[r] = '\0';
        f.close();
    }
}