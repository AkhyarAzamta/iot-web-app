#include <WiFi.h>
#include <WiFiManager.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <RTClib.h>
#include <ArduinoJson.h>
#include "FS.h"
#include <LittleFS.h>

// Pin definitions
#define LED_PIN             2    // GPIO2 onboard LED
#define TDS_PIN             36   // ADC1_CH0, aman dengan Wi-Fi
#define CONFIG_PIN          13   // tombol config
#define CLOCK_INTERRUPT_PIN 4    // SQW interrupt (RTC)
#define I2C_SDA_PIN         21
#define I2C_SCL_PIN         22
#define LED_ON  HIGH   // ubah jadi LOW jika LED-mu aktif-LOW
#define LED_OFF LOW
// Feature flags
#define USE_RTC                1
#define FORMAT_LITTLEFS_IF_FAILED true

// Constants
#define VREF                   3.3f
#define SCOUNT                 30
#define BASELINE_OFFSET        4.3f
#define PUBLISH_INTERVAL_MS    500
#define MAX_ALARMS             10
#define DEVICEID_MAX_LEN       20
#define ID_MAX_LEN             20


// MQTT broker
const char* MQTT_BROKER = "broker.hivemq.com";
const int   MQTT_PORT   = 1883;

// Filesystem paths
const char* ALARM_FILE    = "/alarms.bin";
const char* DEVICEID_FILE = "/deviceid.txt";
const char* USERID_FILE    = "/userid.txt";

// Globals
char deviceId[DEVICEID_MAX_LEN] = "device1";
char userId  [ID_MAX_LEN] = "user1";

String topicSensorPub, topicLedSub, topicAlarmSet, topicAlarmList;

WiFiClient   wifiClient;
PubSubClient mqttClient(wifiClient);
#if USE_RTC
RTC_DS3231 rtc;
#endif

unsigned long lastPublish    = 0;
unsigned long lastSampleMs   = 0;
unsigned long lastComputeMs  = 0;

// TDS sampling
int    analogBuffer[SCOUNT];
int    analogBufferIndex = 0;
float  temperature       = 25.0f;  // suhu air, bisa diupdate jika pakai sensor

// Alarm struct
struct Alarm {
  uint16_t id;
  uint8_t  hour, minute;
  int      duration;
  int      lastDayTrig, lastMinTrig;
};
Alarm alarms[MAX_ALARMS];
uint8_t alarmCount   = 0;
uint16_t nextAlarmId = 1;
bool    feeding      = false;
uint32_t feedingEnd  = 0;

// Prototypes
void    setupPins(), setupADC(), prefillAnalogBuffer();
void    setupFileSystem(), loadConfiguration();
void    setupWiFiManager(), setupRTC(), setupTimezone(), setupMQTT();
float   computeTDS();
void    connectMqtt(), mqttCallback(char*, byte*, unsigned int);
bool    addAlarm(uint16_t, uint8_t, uint8_t, int);
bool    editAlarm(uint16_t, uint8_t, uint8_t, int);
bool    delAlarm(uint16_t);
void    listAlarms(), checkAlarms();
void    saveAlarmsToFS(), loadAlarmsFromFS();
void    saveDeviceIdToFS(), loadDeviceIdFromFS();
void    saveUserIdToFS(),   loadUserIdFromFS();

#if USE_RTC
void onAlarmISR();
#endif

//==============================================================================
void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("=== ESP32 System Starting ===");

  setupPins();
  setupADC();
  prefillAnalogBuffer();
  setupFileSystem();
  loadConfiguration();
  setupWiFiManager();
  setupRTC();
  setupTimezone();
  setupMQTT();

  Serial.printf("[WIFI] Device ID: %s\n", deviceId);
  Serial.printf("[WIFI] User ID: %s\n", userId);
}

// === Modular Functions ===

void setupPins() {
  pinMode(LED_PIN, OUTPUT);
  pinMode(CONFIG_PIN, INPUT_PULLUP);
  digitalWrite(LED_PIN, HIGH);
}

void setupADC() {
  analogSetWidth(12);
  analogSetPinAttenuation(TDS_PIN, ADC_11db);
}

void prefillAnalogBuffer() {
  for (int i = 0; i < SCOUNT; i++) {
    analogBuffer[i] = analogRead(TDS_PIN);
    delay(20);
  }
}

void setupFileSystem() {
  if (!LittleFS.begin(FORMAT_LITTLEFS_IF_FAILED)) {
    Serial.println("[FS] Mount failed!");
    while (1) delay(1000);
  }
}

void loadConfiguration() {
  loadAlarmsFromFS();
  loadDeviceIdFromFS();
  loadUserIdFromFS();
}

void setupWiFiManager() {
  WiFiManager wm;
  WiFiManagerParameter dp("device_id", "Device ID", deviceId, ID_MAX_LEN);
  WiFiManagerParameter up("user_id",   "User ID",   userId,   ID_MAX_LEN);
  wm.addParameter(&dp);
  wm.addParameter(&up);

  if (digitalRead(CONFIG_PIN) == LOW) {
    Serial.println("[WIFI] Enter config portal");
    if (!wm.startConfigPortal("ESP32_Config")) ESP.restart();
    strcpy(deviceId, dp.getValue());
    strcpy(userId,   up.getValue());
    saveDeviceIdToFS();
        saveUserIdToFS();

  } else {
    Serial.println("[WIFI] Auto-connect");
    if (!wm.autoConnect()) ESP.restart();
  }
}

void setupTimezone() {
  Serial.println("[GEO] Sinkronisasi zona waktu via IP-API…");

  // 1) (Optional) Ambil tz name dari API, tapi kita gunakan POSIX untuk WIB
  //    configTzTime otomatis pakai TZ string "WIB-7"
  configTzTime("WIB-7", "pool.ntp.org", "time.nist.gov");

  // 2) Tunggu hingga NTP sync (max 10s)
  time_t now = time(nullptr);
  unsigned long start = millis();
  while (now < 8*3600 && millis() - start < 10000) {
    delay(200);
    now = time(nullptr);
  }

  // 3) Breakdown ke local time
  struct tm ti;
  localtime_r(&now, &ti);
  Serial.printf("[GEO] Local time: %04d-%02d-%02d %02d:%02d:%02d\n",
    ti.tm_year + 1900, ti.tm_mon + 1, ti.tm_mday,
    ti.tm_hour, ti.tm_min, ti.tm_sec);

  // 4) ***TULIS ke RTC***
  #if USE_RTC
    rtc.adjust( DateTime(
      ti.tm_year + 1900,
      ti.tm_mon  + 1,
      ti.tm_mday,
      ti.tm_hour,
      ti.tm_min,
      ti.tm_sec
    ) );
    Serial.printf("[RTC] Di-adjust ke lokal: %02d:%02d:%02d\n",
      ti.tm_hour, ti.tm_min, ti.tm_sec);
  #endif
}


void setupMQTT() {
  String pfx = String(userId);               // pake userId sebagai prefix
  topicSensorPub = pfx + "/sensordata/" + deviceId;
  topicLedSub    = pfx + "/relay/"      + deviceId;
  topicAlarmSet  = pfx + "/alarmset/"   + deviceId;
  topicAlarmList = pfx + "/alarmlist/"  + deviceId;
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
}

void setupRTC() {
  #if USE_RTC
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  if (!rtc.begin()) {
    Serial.println("[RTC] Not found!");
    while (1) delay(1000);
  }
  if (rtc.lostPower()) rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
  rtc.disable32K();
  rtc.clearAlarm(1);
  rtc.clearAlarm(2);
  rtc.writeSqwPinMode(DS3231_OFF);
  pinMode(CLOCK_INTERRUPT_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(CLOCK_INTERRUPT_PIN), onAlarmISR, FALLING);
  #endif
}

//==============================================================================

void loop() {
if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WIFI] Connection lost. Retrying...");
    WiFi.reconnect();
    delay(5000); // Tunggu 5 detik sebelum restart
    if (WiFi.status() != WL_CONNECTED) ESP.restart();
}
if (!mqttClient.connected()) connectMqtt();
  mqttClient.loop();

  unsigned long now = millis();

  // 1) Sampling tiap 40 ms
  if (now - lastSampleMs >= 40) {
    lastSampleMs = now;
    analogBuffer[analogBufferIndex++] = analogRead(TDS_PIN);
    if (analogBufferIndex >= SCOUNT) analogBufferIndex = 0;
  }

  // 2) Hitung & publish tiap 800 ms
  if (now - lastComputeMs >= 800) {
    lastComputeMs = now;
    float tds = computeTDS();
    Serial.printf("TDS: %.1f ppm\n", tds);
    String pl = String("{\"tds\":") + String(tds,1) + "}";
    mqttClient.publish(topicSensorPub.c_str(), pl.c_str());
  }

  // 3) Cek dan jalankan alarm feeding
  checkAlarms();
}

//==============================================================================

float computeTDS() {
  // copy & sort untuk median
  int tmp[SCOUNT];
  memcpy(tmp, analogBuffer, sizeof(tmp));
  for (int i = 0; i < SCOUNT - 1; i++)
    for (int j = 0; j < SCOUNT - 1 - i; j++)
      if (tmp[j] > tmp[j+1]) std::swap(tmp[j], tmp[j+1]);

  int med = (SCOUNT % 2)
            ? tmp[SCOUNT/2]
            : (tmp[SCOUNT/2] + tmp[SCOUNT/2 - 1]) / 2;

  // ADC → Volt
  float voltage = (float)med * VREF / 4095.0f;

  // Kompensasi suhu
  float coeff = 1.0f + 0.02f * (temperature - 25.0f);
  float compV = voltage / coeff;

  // Kurva TDS (ppm)
  float tds = (133.42f * compV*compV*compV
             - 255.86f * compV*compV
             + 857.39f * compV) * 0.5f
             - BASELINE_OFFSET;

  return tds > 0 ? tds : 0;
}

//==============================================================================

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
    digitalWrite(LED_PIN, msg == "ON" ? HIGH : LOW);
    return;
  }
  if (String(topic) == topicAlarmSet) {
  JsonDocument doc;
  auto err = deserializeJson(doc, payload, length);
  if (err) {
    Serial.println("[MQTT] JSON parse error");
    return;
  }
  String action = doc["action"] | "";
      uint16_t id   = doc["id"] | 0;  // default 0 kalau nggak ada

if (action == "ADD") {
  uint16_t id = doc["id"] | 0;
  if (id == 0) {
    id = nextAlarmId++;
  }
  uint8_t h = doc["hour"]    | 0;
  uint8_t m = doc["minute"]  | 0;
  int     d = doc["duration"]| 0;
  addAlarm(id, h, m, d);
  listAlarms();
}
  else if (action == "EDIT") {
    uint8_t h = doc["hour"];
    uint8_t m = doc["minute"];
    int     d = doc["duration"];
    if (editAlarm(id, h, m, d)) {
      Serial.printf("[ALARM] EDIT OK: id=%u\n", id);
    } else {
      Serial.printf("[ALARM] EDIT GAGAL: id=%u tidak ada\n", id);
    }
    listAlarms();
  }
  else if (action == "DEL") {
    if (delAlarm(id)) {
      Serial.printf("[ALARM] DEL  OK: id=%u\n", id);
    } else {
      Serial.printf("[ALARM] DEL  GAGAL: id=%u tidak ada\n", id);
    }
    listAlarms();
  }
  else if (action == "LIST") {
    Serial.println("[ALARM] Permintaan LIST diterima");
    listAlarms();
  }
  }
}

//==============================================================================

bool addAlarm(uint16_t id, uint8_t h, uint8_t m, int durSec) {
  if (alarmCount >= MAX_ALARMS) {
    Serial.printf("[ALARM] ADD GAGAL: kapasitas penuh (id=%u)\n", id);
    return false;
  }
  // cek duplikat id
  for (uint8_t i = 0; i < alarmCount; i++) {
    if (alarms[i].id == id) {
      Serial.printf("[ALARM] ADD GAGAL: id=%u sudah ada\n", id);
      return false;
    }
  }
  alarms[alarmCount++] = { id, h, m, durSec, -1, -1 };
  // update nextAlarmId
  nextAlarmId = max(nextAlarmId, uint16_t(id + 1));
  Serial.printf("[ALARM] ADD  id=%u  time=%02u:%02u  dur=%ds\n",
                id, h, m, durSec);
  saveAlarmsToFS();
  return true;
}


bool editAlarm(uint16_t id, uint8_t h, uint8_t m, int durSec) {
  for (uint8_t i = 0; i < alarmCount; i++) {
    if (alarms[i].id == id) {
      Serial.printf("[ALARM] EDIT id=%u  dari %02u:%02u dur=%ds  jadi %02u:%02u dur=%ds\n",
                    id,
                    alarms[i].hour, alarms[i].minute, alarms[i].duration,
                    h, m, durSec);
      alarms[i].hour     = h;
      alarms[i].minute   = m;
      alarms[i].duration = durSec;
      saveAlarmsToFS();
      return true;
    }
  }
  Serial.printf("[ALARM] Gagal edit: id=%u tidak ditemukan\n", id);
  return false;
}

bool delAlarm(uint16_t id) {
  for (uint8_t i = 0; i < alarmCount; i++) {
    if (alarms[i].id == id) {
      Serial.printf("[ALARM] DEL  id=%u  time=%02u:%02u  dur=%ds\n",
                    id, alarms[i].hour, alarms[i].minute, alarms[i].duration);
      // geser sisanya ke kiri
      for (uint8_t j = i; j < alarmCount - 1; j++) {
        alarms[j] = alarms[j+1];
      }
      alarmCount--;
      saveAlarmsToFS();
      return true;
    }
  }
  Serial.printf("[ALARM] Gagal delete: id=%u tidak ditemukan\n", id);
  return false;
}

void listAlarms() {
  Serial.println("[ALARM] LIST:");
  if (alarmCount == 0) {
    Serial.println("  (kosong)");
  }
  for (uint8_t i = 0; i < alarmCount; i++) {
    Serial.printf("  id=%u  %02u:%02u  dur=%ds\n",
                  alarms[i].id,
                  alarms[i].hour, alarms[i].minute,
                  alarms[i].duration);
  }

  // Kirim JSON via MQTT seperti biasa
  JsonDocument doc;
  auto arr = doc.to<JsonArray>();
  for (uint8_t i = 0; i < alarmCount; i++) {
    auto o = arr.add<JsonObject>();
    o["id"]       = alarms[i].id;
    o["hour"]     = alarms[i].hour;
    o["minute"]   = alarms[i].minute;
    o["duration"] = alarms[i].duration;
  }
  String out; serializeJson(doc, out);
  mqttClient.publish(topicAlarmList.c_str(), out.c_str());
}

//==============================================================================

void checkAlarms() {
  DateTime now = rtc.now();
  int curH = now.hour();
  int curM = now.minute();
  int curS = now.second();
  int curD = now.day();

  // DEBUG: tampilkan time sekarang
  // Serial.printf("[TIME] %02d:%02d:%02d\n", curH, curM, curS);

  for (uint8_t i = 0; i < alarmCount; i++) {
    Alarm &a = alarms[i];
    // cek jika belum pernah trig dan kita masih di “window” 0–5 detik pertama
    if (a.lastDayTrig == curD && a.lastMinTrig == curM) continue;
    if (a.hour == curH && a.minute == curM && curS < 5) {
      a.lastDayTrig = curD;
      a.lastMinTrig = curM;
      feeding       = true;
      feedingEnd    = millis() + (uint32_t)a.duration * 1000UL;
      Serial.printf("[ALARM] Trigger id=%u, ON %ds\n", a.id, a.duration);
      digitalWrite(LED_PIN, LED_ON);
      saveAlarmsToFS();
      break;
    }
  }

  if (feeding && millis() >= feedingEnd) {
    feeding = false;
    digitalWrite(LED_PIN, LED_OFF);
    Serial.println("[ALARM] Feeding ended, LED_OFF");
  }
}

//==============================================================================

void saveAlarmsToFS() {
  File f = LittleFS.open(ALARM_FILE, "w");
  if (!f) return;
  f.write(alarmCount);
  for (uint8_t i = 0; i < alarmCount; i++) {
    f.write((uint8_t*)&alarms[i], sizeof(Alarm));
  }
  f.close();
}

void loadAlarmsFromFS() {
  if (!LittleFS.exists(ALARM_FILE)) {
    alarmCount = 0;
    nextAlarmId = 1;
    return;
  }
  File f = LittleFS.open(ALARM_FILE, "r");
  if (!f) {
    alarmCount = 0;
    nextAlarmId = 1;
    return;
  }

  size_t sz = f.size();             // total bytes on disk
  if (sz < 1) {                     // paling tidak ada 1 byte untuk count
    f.close();
    LittleFS.remove(ALARM_FILE);
    alarmCount = 0;
    nextAlarmId = 1;
    return;
  }

  uint8_t cnt = f.read();           // baca jumlah alarm
  size_t expected = 1 + cnt * sizeof(Alarm);
  if (cnt > MAX_ALARMS || sz != expected) {
    // corrupt atau format lama: buang file
    f.close();
    LittleFS.remove(ALARM_FILE);
    alarmCount = 0;
    nextAlarmId = 1;
    Serial.println("[FS] alarms.bin corrupt, reset alarms");
    return;
  }

  alarmCount = cnt;
  for (uint8_t i = 0; i < alarmCount; i++) {
    f.read((uint8_t*)&alarms[i], sizeof(Alarm));
  }
  f.close();

  // rebuild nextAlarmId
  nextAlarmId = 1;
  for (uint8_t i = 0; i < alarmCount; i++) {
    nextAlarmId = max<uint16_t>(nextAlarmId, alarms[i].id + 1);
  }
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

void saveUserIdToFS(){
  File f=LittleFS.open(USERID_FILE,"w"); if(!f) return;
  f.print(userId); f.close();
}
void loadUserIdFromFS(){
  if(!LittleFS.exists(USERID_FILE)) return;
  File f=LittleFS.open(USERID_FILE,"r"); if(!f) return;
  size_t l=f.readBytes(userId,ID_MAX_LEN-1);
  userId[l]=0; f.close();
}

#if USE_RTC
void onAlarmISR() {
  digitalWrite(LED_PIN, !digitalRead(LED_PIN));
}
#endif
