#include "FileStorage.h"
#include <LittleFS.h>
#include "Alarm.h"
#include <Arduino.h>

static const char *ALARM_FILE = "/alarms.bin";
static const char *SENSOR_SETTINGS_FILE = "/sensor_settings.bin";
static const char *DEVICEID_FILE = "/deviceid.txt";

void initFS()
{
    if (!LittleFS.begin(true))
    {
        Serial.println("[FS] Mount failed");
        while (1)
            delay(1000);
    }
    Serial.println("[FS] Mounted successfully.");
}

void saveAlarmsToFS() { Alarm::saveAll(); }
void loadAlarmsFromFS() { Alarm::loadAll(); }

void saveDeviceId(const char *id)
{
    File f = LittleFS.open(DEVICEID_FILE, "w");
    if (f)
    {
        f.print(id);
        f.close();
    }
}

void loadDeviceId(char *id, size_t len)
{
    // id sudah berisi default
    if (!LittleFS.exists(DEVICEID_FILE))
        return;
    File f = LittleFS.open(DEVICEID_FILE, "r");
    if (!f)
        return;

    // alok buffer len byte
    char *buf = (char *)malloc(len);
    if (!buf)
    {
        f.close();
        return;
    }
    // baca maksimal len-1, sisakan 1 byte untuk '\0'
    size_t n = f.readBytes(buf, len - 1);
    f.close();

    if (n > 0)
    {
        buf[n] = '\0';
        // copy ke id, jaga terminator
        strncpy(id, buf, len);
        id[len - 1] = '\0';
        Serial.printf("[FS] Loaded deviceId = '%s'\n", id);
    }
    else
    {
        Serial.println("[FS] deviceid file empty, keep default");
    }
    free(buf);
}
