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
    S_TEMPERATURE = 0,
    S_TURBIDITY   = 1,
    S_TDS         = 2,
    S_PH          = 3,
};

// Struktur data untuk setting sensor
struct SensorSetting {
    uint16_t   id;           // id unik final (0 artinya “baru/offline”)
    SensorType type;         // jenis sensor
    float      minValue;     // batas bawah
    float      maxValue;     // batas atas
    bool       enabled;      // aktif/tidak

    // Tambahan untuk offline sync:
    bool       pending;      // true = perlu dikirim ke backend
    bool       isTemporary;  // true = entry baru, backend yang assign ID
    uint16_t   tempIndex;    // indeks sementara untuk matching ACK
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
    static void initAllSettings();
    static void saveAllSettings();
    // CRUD API untuk setting
    static SensorSetting* getAllSettings(uint8_t &outCount);
    static bool            addSetting(const SensorSetting &s);
    static bool            editSetting(const SensorSetting &s);
    static bool            removeSetting(uint16_t id);
    static void checkSensorLimits();
    static SensorSetting settings[MAX_SENSOR_SETTINGS];
    static uint8_t       settingCount;

    
private:
    // Penyimpanan internal
    static uint16_t      nextSettingId;
    uint8_t   editIndex   = 0;
    SensorSetting* sensors    = nullptr;
    static unsigned long lastTempRequestMs;
    static bool alerted[MAX_SENSOR_SETTINGS];

};


#endif // SENSOR_H
