// RTC.h
#ifndef RTCHANDLER_H
#define RTCHANDLER_H

#include <RTClib.h>

class RTCHandler
{
public:
  RTCHandler();
  void setupRTC();
  String getTime();
  String getDate();

private:
  RTC_DS3231 rtc;
};

#endif