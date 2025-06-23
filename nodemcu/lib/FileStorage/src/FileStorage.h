#ifndef FILESTORAGE_H
#define FILESTORAGE_H

#include <Arduino.h>

void initFS();
void saveAlarmsToFS();
void loadAlarmsFromFS();
void saveDeviceId(const char* id);
void loadDeviceId(char* id, size_t len);

#endif // FILESTORAGE_H