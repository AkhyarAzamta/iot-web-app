#ifndef RTC_H
#define RTC_H

#include <RTClib.h>

// Instance RTC
extern RTC_DS3231 rtc;

/** Inisialisasi Wire dan RTC DS3231 */
void setupRTC();

#endif // RTC_H