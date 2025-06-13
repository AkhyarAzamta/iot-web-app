#include <ESP8266WiFi.h>
#include <WiFiManager.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <RTClib.h>
#include <ArduinoJson.h>
#include <EEPROM.h>
#define EEPROM_SIZE 512
#define TdsSensorPin      A0
#define VREF              3.3
#define SCOUNT            30
#define BASELINE_OFFSET   4.3
#define CONFIG_PIN D3 // Ganti dari D8 ke D3 (GPIO0)
#define MAX_ALARMS        10
#define EEPROM_ADDR_DEVICEID 480 // Mulai dari byte 480 ke atas (jangan bentrok dengan alarm)
#define DEVICEID_MAX_LEN     20

int analogBuffer[SCOUNT], analogBufferTemp[SCOUNT], analogBufferIndex = 0;
float temperature = 23, tds = 0;

const char* MQTT_BROKER = "broker.hivemq.com";
const int   MQTT_PORT   = 1883;

char   deviceId[20] = "device1";
String topicSensorPub, topicLedSub, topicAlarmSet, topicAlarmList;

WiFiClient   wifiClient;
PubSubClient mqttClient(wifiClient);
RTC_DS3231   rtc;

unsigned long lastPublish = 0;
const unsigned long PUBLISH_INTERVAL = 500;

struct Alarm {
  uint16_t id;
  uint8_t  hour;
  uint8_t  minute;
  int      duration;
  int      lastDayTrig;
  int      lastMinTrig;
};
Alarm alarms[MAX_ALARMS];
uint8_t alarmCount = 0;
uint16_t nextAlarmId = 0;

bool feeding = false;
uint32_t feedingEnd = 0;

// Prototypes
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
void loadAlarmsFromEEPROM();
void saveAlarmsToEEPROM();
void loadDeviceIdFromEEPROM();
void saveDeviceIdToEEPROM();

void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("=== ESP8266 Alarm System Starting ===");

  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(CONFIG_PIN, INPUT_PULLUP); // tombol aktif LOW
  pinMode(TdsSensorPin, INPUT);
  digitalWrite(LED_BUILTIN, HIGH);
  delay(50);

  EEPROM.begin(EEPROM_SIZE);
  loadAlarmsFromEEPROM();
  loadDeviceIdFromEEPROM(); // muat deviceId sebelum digunakan

  WiFiManager wm;
  WiFiManagerParameter devParam("device_id", "Device ID", deviceId, DEVICEID_MAX_LEN);

  // Cek apakah tombol ditekan untuk masuk config mode
  if (digitalRead(CONFIG_PIN) == LOW) {
    Serial.println("[WIFI] Config pin LOW, entering config portal...");
    wm.addParameter(&devParam);
    if (!wm.startConfigPortal("ESP_Config")) {
      Serial.println("[WIFI] Failed to start config portal. Restarting...");
      ESP.restart();
    }
    strcpy(deviceId, devParam.getValue());
    saveDeviceIdToEEPROM();
    Serial.print("[WIFI] Configured deviceId: ");
    Serial.println(deviceId);
  } else {
    Serial.println("[WIFI] Attempting auto-connect...");
    if (!wm.autoConnect()) {
      Serial.println("[WIFI] AutoConnect failed. Restarting...");
      ESP.restart();
    }
    Serial.print("[WIFI] AutoConnect success, using deviceId: ");
    Serial.println(deviceId);
  }

  topicSensorPub = "akhyarazamta/sensordata/" + String(deviceId);
  topicLedSub    = "led/control/" + String(deviceId);
  topicAlarmSet  = "akhyarazamta/alarmset/" + String(deviceId);
  topicAlarmList = "akhyarazamta/alarmlist/" + String(deviceId);

  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);

  Wire.begin(D2, D1);
  if (!rtc.begin()) {
    Serial.println("[RTC] RTC not found!");
    delay(5000);
    ESP.restart();
  }
  if (rtc.lostPower()) {
    rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
    Serial.println("[RTC] Lost power, time set to compile time.");
  }
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) ESP.restart();
  if (!mqttClient.connected()) connectMqtt();
  mqttClient.loop();

  // Publish TDS
  if (millis() - lastPublish >= PUBLISH_INTERVAL) {
    lastPublish = millis();
    sampleAnalog();
    tds = readTDS();
    String pl = String("{\"tds\":") + String(tds,1) + "}";
    mqttClient.publish(topicSensorPub.c_str(), pl.c_str());
  }

  checkAlarms();
}

void connectMqtt() {
  while (!mqttClient.connected()) {
    String cid = String("ESP8266-") + deviceId + "-" + String(random(0xffff), HEX);
    if (mqttClient.connect(cid.c_str())) {
      mqttClient.subscribe(topicLedSub.c_str());
      mqttClient.subscribe(topicAlarmSet.c_str());
      Serial.println("[MQTT] Connected & Subscribed");
    } else {
      delay(3000);
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("[MQTT cb] "); Serial.println(topic);
  String msg;
  for (unsigned i=0; i<length; i++) msg += (char)payload[i];

  if (strcmp(topic, topicLedSub.c_str()) == 0) {
    digitalWrite(LED_BUILTIN, msg == "ON" ? LOW : HIGH);
    return;
  }
  if (strcmp(topic, topicAlarmSet.c_str()) == 0) {
    JsonDocument doc; // cukup auto-allocate
    if (deserializeJson(doc, msg)) return;
    
    String action = doc["action"];
    if (action == "ADD") {
      if (addAlarm(doc["hour"], doc["minute"], doc["duration"])) listAlarms();
    } else if (action == "EDIT") {
      if (editAlarm(doc["id"], doc["hour"], doc["minute"], doc["duration"])) listAlarms();
    } else if (action == "DEL") {
      if (delAlarm(doc["id"])) listAlarms();
    } else if (action == "LIST") {
      listAlarms();
    }
  }
}

bool addAlarm(uint8_t h, uint8_t m, int durSec) {
  if (alarmCount >= MAX_ALARMS) {
    Serial.println("[ALARM] Cannot add: Max alarms reached");
    return false;
  }
  alarms[alarmCount++] = { nextAlarmId++, h, m, durSec, -1, -1 };
  Serial.printf("[ALARM] Added: %02u:%02u dur %ds (ID %u)\n", h, m, durSec, nextAlarmId - 1);
  saveAlarmsToEEPROM();
  return true;
}

bool editAlarm(uint16_t id, uint8_t h, uint8_t m, int durSec) {
  for (uint8_t i = 0; i < alarmCount; i++) {
    if (alarms[i].id == id) {
      alarms[i].hour     = h;
      alarms[i].minute   = m;
      alarms[i].duration = durSec;
      Serial.printf("[ALARM] Edited ID %u -> %02u:%02u dur %ds\n", id, h, m, durSec);
      saveAlarmsToEEPROM();
      return true;
    }
  }
  Serial.printf("[ALARM] Edit failed: ID %u not found\n", id);
  return false;
}

bool delAlarm(uint16_t id) {
  for (uint8_t i = 0; i < alarmCount; i++) {
    if (alarms[i].id == id) {
      for (uint8_t j = i; j < alarmCount - 1; j++) alarms[j] = alarms[j + 1];
      alarmCount--;
      Serial.printf("[ALARM] Deleted ID %u\n", id);
      saveAlarmsToEEPROM();
      return true;
    }
  }
  Serial.printf("[ALARM] Delete failed: ID %u not found\n", id);
  return false;
}

void listAlarms() {
  JsonDocument doc; // DynamicJsonDocument => JsonDocument
  JsonArray arr = doc.to<JsonArray>();
  for (uint8_t i = 0; i < alarmCount; i++) {
    JsonObject o = arr.add<JsonObject>(); // createNestedObject() => add<JsonObject>()
    o["id"]       = alarms[i].id;
    o["hour"]     = alarms[i].hour;
    o["minute"]   = alarms[i].minute;
    o["duration"] = alarms[i].duration;
  }
  String out;
  serializeJson(doc, out);
  mqttClient.publish(topicAlarmList.c_str(), out.c_str());
  Serial.print("[MQTT] Alarm list: "); Serial.println(out);
}

void checkAlarms() {
  DateTime now = rtc.now();
  for (uint8_t i=0; i<alarmCount; i++) {
    Alarm &a = alarms[i];
    // hanya trigger sekali per menit
    if (a.lastDayTrig == now.day() && a.lastMinTrig == now.minute()) continue;
    if (now.hour() == a.hour && now.minute() == a.minute) {
      a.lastDayTrig = now.day();
      a.lastMinTrig = now.minute();
      feeding       = true;
      feedingEnd    = millis() + a.duration * 1000UL;
      digitalWrite(LED_BUILTIN, LOW);
      Serial.printf("[ALARM] Start %u @%02u:%02u dur %ds\n", a.id, a.hour, a.minute, a.duration);
      break;
    }
  }
  if (feeding && millis() >= feedingEnd) {
    feeding = false;
    digitalWrite(LED_BUILTIN, HIGH);
    Serial.println("[ALARM] Feeding done");
  }
}

void sampleAnalog() {
  analogBuffer[analogBufferIndex] = analogRead(TdsSensorPin);
  if (++analogBufferIndex == SCOUNT) analogBufferIndex = 0;
}

float readTDS() {
  for (int i=0; i<SCOUNT; i++) analogBufferTemp[i] = analogBuffer[i];
  float v = getMedianNum(analogBufferTemp, SCOUNT) * VREF / 1024.0;
  v /= (1.0 + 0.02*(temperature-25.0));
  float raw = (133.42*v*v*v - 255.86*v*v + 857.39*v) * 0.5 - BASELINE_OFFSET;
  return raw > 0 ? raw : 0;
}

int getMedianNum(int bArray[], int len) {
  int bTab[SCOUNT];
  if (len > SCOUNT) len = SCOUNT;
  memcpy(bTab, bArray, len * sizeof(int));
  for (int j=0; j<len-1; j++) {
    for (int i=0; i<len-j-1; i++) {
      if (bTab[i] > bTab[i+1]) {
        int tmp = bTab[i];
        bTab[i] = bTab[i+1];
        bTab[i+1] = tmp;
      }
    }
  }
  return (len%2==0)?(bTab[len/2]+bTab[len/2-1])/2:bTab[len/2];
}
void saveAlarmsToEEPROM() {
  byte* p = (byte*)alarms;
  for (uint16_t i = 0; i < sizeof(alarms); i++) {
    EEPROM.write(i, p[i]);
  }
  EEPROM.write(sizeof(alarms), alarmCount);
  EEPROM.commit();
  Serial.print("[EEPROM] Alarms saved. Total: "); Serial.println(alarmCount);
}


void loadAlarmsFromEEPROM() {
  byte* p = (byte*)alarms;
  for (uint16_t i = 0; i < sizeof(alarms); i++) {
    p[i] = EEPROM.read(i);
  }
  alarmCount = EEPROM.read(sizeof(alarms));
  if (alarmCount > MAX_ALARMS) {
    Serial.println("[EEPROM] Invalid alarm count, resetting...");
    alarmCount = 0;
  }
  nextAlarmId = 0;
  for (uint8_t i = 0; i < alarmCount; i++) {
    nextAlarmId = max(nextAlarmId, (uint16_t)(alarms[i].id + 1));
    Serial.printf("[EEPROM] Alarm #%u: %02u:%02u dur %ds\n",
      alarms[i].id, alarms[i].hour, alarms[i].minute, alarms[i].duration);
  }
  Serial.print("[EEPROM] Total alarms loaded: ");
  Serial.println(alarmCount);
}

void saveDeviceIdToEEPROM() {
  for (uint8_t i = 0; i < 20; i++) {
    EEPROM.write(sizeof(alarms) + 1 + i, deviceId[i]);
  }
  EEPROM.commit();
  Serial.print("[EEPROM] Device ID saved: ");
  Serial.println(deviceId);
}

void loadDeviceIdFromEEPROM() {
  for (uint8_t i = 0; i < 20; i++) {
    deviceId[i] = EEPROM.read(sizeof(alarms) + 1 + i);
  }
  deviceId[19] = '\0'; // null terminator
  Serial.print("[EEPROM] Loaded device ID: ");
  Serial.println(deviceId);
}
