#include <WiFi.h>
#include <WiFiManager.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <RTClib.h>
#include <ArduinoJson.h>
#include "FS.h"
#include <LittleFS.h>

// Pin definitions
#define LED_PIN             2   // GPIO2 onboard LED
#define TDS_PIN             34  // ADC1_0
#define CONFIG_PIN          13   // GPIO5 for config button
#define CLOCK_INTERRUPT_PIN 4   // GPIO4 for SQW interrupt
#define I2C_SDA_PIN         21  // Default SDA
#define I2C_SCL_PIN         22  // Default SCL

// Feature flags
#define USE_RTC                1   // 1 = gunakan RTC & SQW ISR, 0 = matikan
#define FORMAT_LITTLEFS_IF_FAILED true

// Constants
#define VREF             3.3f
#define SCOUNT           30
#define BASELINE_OFFSET  4.3f
#define MAX_ALARMS       10
#define DEVICEID_MAX_LEN 20

// MQTT broker
const char* MQTT_BROKER = "broker.hivemq.com";
const int   MQTT_PORT   = 1883;

// Filesystem paths
const char* ALARM_FILE    = "/alarms.bin";
const char* DEVICEID_FILE = "/deviceid.txt";

// Globals
char deviceId[DEVICEID_MAX_LEN] = "device1";
String topicSensorPub, topicLedSub, topicAlarmSet, topicAlarmList;

WiFiClient   wifiClient;
PubSubClient mqttClient(wifiClient);
#if USE_RTC
RTC_DS3231   rtc;
#endif

unsigned long lastPublish       = 0;
const unsigned long PUBLISH_INTERVAL = 500;

// Alarm struct
struct Alarm {
  uint16_t id;
  uint8_t  hour;
  uint8_t  minute;
  int      duration;
  int      lastDayTrig;
  int      lastMinTrig;
};
Alarm alarms[MAX_ALARMS];
uint8_t  alarmCount   = 0;
uint16_t nextAlarmId  = 0;

bool     feeding      = false;
uint32_t feedingEnd   = 0;

// ADC buffer
int    analogBuffer[SCOUNT];
int    analogBufferIndex = 0;
float  temperature       = 23.0f;

// Function prototypes
void sampleAnalog();
float readTDS();
int   getMedianNum(int bArray[], int len);
bool  addAlarm(uint8_t h, uint8_t m, int durSec);
bool  editAlarm(uint16_t id, uint8_t h, uint8_t m, int durSec);
bool  delAlarm(uint16_t id);
void  listAlarms();
void  checkAlarms();
void  mqttCallback(char* topic, byte* payload, unsigned int length);
void  connectMqtt();
void  loadAlarmsFromFS();
void  saveAlarmsToFS();
void  loadDeviceIdFromFS();
void  saveDeviceIdToFS();
#if USE_RTC
void  onAlarm();  // ISR untuk SQW
#endif

void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("=== ESP32 System Starting ===");

  // Pin setup
  pinMode(LED_PIN, OUTPUT);
  pinMode(CONFIG_PIN, INPUT_PULLUP);
  pinMode(TDS_PIN, INPUT);
  digitalWrite(LED_PIN, HIGH);
  delay(50);

  // Mount LittleFS (auto-format jika perlu)
  if (!LittleFS.begin(FORMAT_LITTLEFS_IF_FAILED)) {
    Serial.println("[FS] LittleFS mount failed!");
    while (1) delay(1000);
  }
  loadAlarmsFromFS();
  loadDeviceIdFromFS();

  // WiFiManager with config button
  WiFiManager wm;
  WiFiManagerParameter devParam("device_id", "Device ID", deviceId, DEVICEID_MAX_LEN);
  wm.addParameter(&devParam);
  if (digitalRead(CONFIG_PIN) == LOW) {
    Serial.println("[WIFI] Entering config portal...");
    if (!wm.startConfigPortal("ESP32_Config")) {
      ESP.restart();
    }
    strcpy(deviceId, devParam.getValue());
    saveDeviceIdToFS();
  } else {
    Serial.println("[WIFI] Auto-connect...");
    if (!wm.autoConnect()) {
      ESP.restart();
    }
  }
  Serial.print("[WIFI] Device ID: "); Serial.println(deviceId);

  // MQTT topics
  topicSensorPub = "akhyarazamta/sensordata/" + String(deviceId);
  topicLedSub    = "led/control/"       + String(deviceId);
  topicAlarmSet  = "akhyarazamta/alarmset/"  + String(deviceId);
  topicAlarmList = "akhyarazamta/alarmlist/" + String(deviceId);

  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);

  // RTC & SQW interrupt
#if USE_RTC
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  if (!rtc.begin()) {
    Serial.println("[RTC] RTC not found!");
    while (1) delay(1000);
  }
  if (rtc.lostPower()) {
    rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
    Serial.println("[RTC] Power lost, time reset");
  }
  rtc.disable32K();
  rtc.clearAlarm(1);
  rtc.clearAlarm(2);
  rtc.writeSqwPinMode(DS3231_OFF);

  pinMode(CLOCK_INTERRUPT_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(CLOCK_INTERRUPT_PIN), onAlarm, FALLING);
#endif
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) ESP.restart();
  if (!mqttClient.connected()) connectMqtt();
  mqttClient.loop();

  if (millis() - lastPublish >= PUBLISH_INTERVAL) {
    lastPublish = millis();
    sampleAnalog();
    float tds = readTDS();
    String pl = String("{\"tds\":") + String(tds,1) + "}";
    mqttClient.publish(topicSensorPub.c_str(), pl.c_str());
  }

  checkAlarms();
}

// MQTT connection
void connectMqtt() {
  while (!mqttClient.connected()) {
    String cid = "ESP32-" + String(deviceId);
    if (mqttClient.connect(cid.c_str())) {
      mqttClient.subscribe(topicLedSub.c_str());
      mqttClient.subscribe(topicAlarmSet.c_str());
      Serial.println("[MQTT] Connected");
    } else {
      delay(2000);
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (unsigned i = 0; i < length; i++) msg += char(payload[i]);

  if (String(topic) == topicLedSub) {
    digitalWrite(LED_PIN, msg == "ON" ? LOW : HIGH);
    return;
  }
  if (String(topic) == topicAlarmSet) {
    JsonDocument doc;
    deserializeJson(doc, msg);
    String action = doc["action"];
    if (action == "ADD")  { if (addAlarm(doc["hour"], doc["minute"], doc["duration"])) listAlarms(); }
    if (action == "EDIT") { if (editAlarm(doc["id"], doc["hour"], doc["minute"], doc["duration"])) listAlarms(); }
    if (action == "DEL")  { if (delAlarm(doc["id"])) listAlarms(); }
    if (action == "LIST") listAlarms();
  }
}

// Alarm CRUD
bool addAlarm(uint8_t h, uint8_t m, int durSec) {
  if (alarmCount >= MAX_ALARMS) return false;
  alarms[alarmCount++] = { nextAlarmId++, h, m, durSec, -1, -1 };
  saveAlarmsToFS();
  return true;
}

bool editAlarm(uint16_t id, uint8_t h, uint8_t m, int durSec) {
  for (uint8_t i = 0; i < alarmCount; i++) {
    if (alarms[i].id == id) {
      alarms[i].hour     = h;
      alarms[i].minute   = m;
      alarms[i].duration = durSec;
      saveAlarmsToFS();
      return true;
    }
  }
  return false;
}

bool delAlarm(uint16_t id) {
  for (uint8_t i = 0; i < alarmCount; i++) {
    if (alarms[i].id == id) {
      for (uint8_t j = i; j < alarmCount - 1; j++)
        alarms[j] = alarms[j + 1];
      alarmCount--;
      saveAlarmsToFS();
      return true;
    }
  }
  return false;
}

void listAlarms() {
  JsonDocument doc;
  auto arr = doc.to<JsonArray>();
  for (uint8_t i = 0; i < alarmCount; i++) {
    auto o = arr.add<JsonObject>();
    o["id"]       = alarms[i].id;
    o["hour"]     = alarms[i].hour;
    o["minute"]   = alarms[i].minute;
    o["duration"] = alarms[i].duration;
  }
  String out;
  serializeJson(doc, out);
  mqttClient.publish(topicAlarmList.c_str(), out.c_str());
}

// Alarm checking
void checkAlarms() {
  int curHour, curMinute, curDay;
#if USE_RTC
  DateTime now = rtc.now();
  curHour   = now.hour();
  curMinute = now.minute();
  curDay    = now.day();
#else
  unsigned long sec = millis() / 1000;
  curMinute = (sec / 60) % 60;
  curHour   = (sec / 3600) % 24;
  curDay    = 0;
#endif

  for (uint8_t i = 0; i < alarmCount; i++) {
    Alarm &a = alarms[i];
    if (a.lastDayTrig == curDay && a.lastMinTrig == curMinute) continue;
    if (a.hour == curHour && a.minute == curMinute) {
      a.lastDayTrig = curDay;
      a.lastMinTrig = curMinute;
      feeding       = true;
      feedingEnd    = millis() + a.duration * 1000UL;
      digitalWrite(LED_PIN, LOW);
      saveAlarmsToFS();
      break;
    }
  }

  if (feeding && millis() >= feedingEnd) {
    feeding = false;
    digitalWrite(LED_PIN, HIGH);
  }
}

// TDS sampling
void sampleAnalog() {
  analogBuffer[analogBufferIndex] = analogRead(TDS_PIN);
  if (++analogBufferIndex >= SCOUNT) analogBufferIndex = 0;
}

float readTDS() {
  int tmp[SCOUNT];
  memcpy(tmp, analogBuffer, sizeof(tmp));
  // median filter
  int sorted[SCOUNT];
  memcpy(sorted, tmp, sizeof(tmp));
  for (int i = 0; i < SCOUNT-1; i++)
    for (int j = 0; j < SCOUNT-1-i; j++)
      if (sorted[j] > sorted[j+1]) {
        int t = sorted[j];
        sorted[j] = sorted[j+1];
        sorted[j+1] = t;
      }
  int med = (SCOUNT%2==0)
            ? (sorted[SCOUNT/2] + sorted[SCOUNT/2-1])/2
            : sorted[SCOUNT/2];

  float v = med * VREF / 4095.0f;
  v /= (1.0f + 0.02f * (temperature - 25.0f));
  float raw = (133.42f*v*v*v - 255.86f*v*v + 857.39f*v)*0.5f - BASELINE_OFFSET;
  return raw > 0 ? raw : 0;
}

// File I/O
void saveAlarmsToFS() {
  File f = LittleFS.open(ALARM_FILE, "w");
  if (!f) return;
  f.write((uint8_t*)alarms, sizeof(alarms));
  f.write(alarmCount);
  f.close();
}

void loadAlarmsFromFS() {
  if (!LittleFS.exists(ALARM_FILE)) return;
  File f = LittleFS.open(ALARM_FILE, "r");
  if (!f) return;
  f.read((uint8_t*)alarms, sizeof(alarms));
  alarmCount = f.read();
  f.close();
  nextAlarmId = 0;
  for (uint8_t i = 0; i < alarmCount; i++)
    nextAlarmId = max(nextAlarmId, (uint16_t)(alarms[i].id + 1));
}

void saveDeviceIdToFS() {
  File f = LittleFS.open(DEVICEID_FILE, "w");
  if (!f) return;
  f.print(deviceId);
  f.close();
}

void loadDeviceIdFromFS() {
  if (!LittleFS.exists(DEVICEID_FILE)) return;
  File f = LittleFS.open(DEVICEID_FILE, "r");
  if (!f) return;
  size_t len = f.readBytes(deviceId, DEVICEID_MAX_LEN-1);
  deviceId[len] = '\0';
  f.close();
}

#if USE_RTC
void onAlarm() {
  // ISR SQW: toggle LED as indication
  digitalWrite(LED_PIN, !digitalRead(LED_PIN));
}
#endif
