// Sensor.h
#ifndef SENSOR_H
#define SENSOR_H

class Sensor {
public:
    // Panggil sekali di setup
    static void init();
    // Panggil setiap millis() >= 40 dari main loop untuk sampling baru
    static void sample();
    // Panggil tiap 800 ms: melakukan median-filtering & hitung TDS
    static float readTDS();

    static float readPH();
    
    static float readTDBT();
    

};

#endif // SENSOR_H
