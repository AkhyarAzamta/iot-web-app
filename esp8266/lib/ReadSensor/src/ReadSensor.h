// Sensor.h
#ifndef READSENSOR_H
#define READSENSOR_H

#include <Arduino.h>
#include <LittleFS.h>
#include <DallasTemperature.h>
#include <OneWire.h>

#define MAX_SENSOR_SETTINGS  10

// Jenis sensor
enum SensorType {
    S_TURBIDITY   = 0,
    S_TDS         = 1,
    S_PH          = 2,
    S_TEMPERATURE = 3
};

// Struktur data untuk setting sensor
struct SensorSetting {
    uint16_t   id;        // id unik
    SensorType type;      // jenis sensor
    float      minValue;  // batas bawah
    float      maxValue;  // batas atas
    bool       enabled;   // aktif/tidak
};

class Sensor {
public:
    // Inisialisasi (panggil di setup())
    static void init();
    static void initTemperatureSensor();

    // Sampling periodik (panggil di loop())
    static void sample();
    // Baca nilai
    static float readTDS();
    static float readPH();
    static float readTDBT();
    static float readTemperatureC();


    // Persistence dasar
    static void loadAllSettings();
    static void initAllSettings();
    static void saveAllSettings();

    // CRUD API untuk setting
    static SensorSetting* getAllSettings(uint8_t &outCount);
    static bool            addSetting(const SensorSetting &s);
    static bool            editSetting(const SensorSetting &s);
    static bool            removeSetting(uint16_t id);
    static void checkSensorLimits();

    
private:
    // Penyimpanan internal
    static SensorSetting settings[MAX_SENSOR_SETTINGS];
    static uint8_t       settingCount;
    static uint16_t      nextSettingId;
    uint8_t   editIndex   = 0;
    SensorSetting* sensors    = nullptr;


};


#endif // SENSOR_H
