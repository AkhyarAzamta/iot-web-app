// MQTT_refactored.cpp
// Refactored for readability, performance, and full ALARM/SENSOR merge‐sync.
// Uses JsonDocument (dynamic, sized by -DMQTT_MAX_PACKET_SIZE=2048).

#include "secrets.h"
#include "MQTT.h"
#include <PubSubClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include "Alarm.h"
#include "ReadSensor.h"

static WiFiClientSecure secureClient;
static PubSubClient mqttClient(secureClient);
static String deviceId;

static constexpr char TOPIC_PREFIX[] = "AkhyarAzamta";
static constexpr char TOPIC_SUFFIX[] = "IoTWebApp";

// Message identifiers
enum MessageId {
  SENSOR_DATA,
  ALARM_SET,
  ALARM_ACK,
  SENSOR_SET,
  SENSOR_ACK,
  MESSAGE_COUNT
};
static const char* MESSAGE_NAMES[MESSAGE_COUNT] = {
  "sensordata",
  "alarmset",
  "alarmack",
  "sensorset",
  "sensorack"
};

// Helpers
bool sensorExists(SensorType t) {
  uint8_t cnt; auto a = Sensor::getAllSettings(cnt);
  for (uint8_t i = 0; i < cnt; ++i) if (a[i].type == t) return true;
  return false;
}

bool publishMessage(MessageId mid, const String& payload, bool retain) {
  if (!mqttClient.connected()) return false;
  String topic = String(TOPIC_PREFIX) + "/" + MESSAGE_NAMES[mid] + "/" + TOPIC_SUFFIX;
  return mqttClient.publish(topic.c_str(),
                            (const uint8_t*)payload.c_str(),
                            payload.length(), retain);
}

// Forward declarations—all take JsonDocument&
void handleAck(JsonDocument& doc);
void handleCommands(JsonDocument& doc);
void handleBackendAlarm(JsonDocument& doc);
void handleSensorCommands(JsonDocument& doc);

// Central MQTT callback
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  JsonDocument doc;  // uses -DMQTT_MAX_PACKET_SIZE for buffer
  auto err = deserializeJson(doc, payload, length);
  if (err) {
    Serial.printf("[MQTT] JSON parse error: %s\n", err.c_str());
    return;
  }

  String cmd      = doc["cmd"].as<const char*>();
  String from     = doc["from"].as<const char*>();
  String incoming = doc["deviceId"].as<const char*>();
  if (from != "BACKEND" || incoming != deviceId) return;

  // ─── Bulk ALARM sync ─────────────────────────────────────
if (cmd == "SYNC_ALARM") {
  // 1) Parse backend array
  JsonArray backendArr = doc["alarms"].as<JsonArray>();

  // 2) First: upsert everything the backend sent
  for (JsonObject o : backendArr) {
    uint16_t id   = o["id"].as<uint16_t>();
    uint8_t h     = o["hour"].as<uint8_t>();
    uint8_t m     = o["minute"].as<uint8_t>();
    int dur       = o["duration"].as<int>();
    bool en       = o["enabled"].as<bool>();

    if (Alarm::exists(id)) {
      Alarm::edit(id, h, m, dur, en);
    } else {
      Alarm::add(id, h, m, dur, en);
    }
  }
  Alarm::saveAll();

  // 3) For each local alarm, check if it was in the backend list
  uint8_t localCnt;
  uint16_t nextTempIndex = 0;

  AlarmData* localArr = Alarm::getAll(localCnt);
  for (uint8_t i = 0; i < localCnt; ++i) {
    uint16_t localId = localArr[i].id;
    if (localId == 0) continue;              // skip temporaries

    bool found = false;
    // scan backendArr for this id
    for (JsonObject o : backendArr) {
      if (o["id"].as<uint16_t>() == localId) {
        found = true;
        break;
      }
    }

    // 4) if not found: request add to backend
    if (!found) {
      JsonDocument req;
      req["cmd"]      = "REQUEST_ADD_ALARM";
      req["from"]     = "ESP";
      req["deviceId"] = deviceId;
      JsonObject a    = req.createNestedObject("alarm");
      a["hour"]       = localArr[i].hour;
      a["minute"]     = localArr[i].minute;
      a["duration"]   = localArr[i].duration;
      a["enabled"]    = localArr[i].enabled;
      req["tempIndex"] = nextTempIndex++;

      String out;
      serializeJson(req, out);
      publishMessage(ALARM_SET, out, false);
      Serial.printf("[MQTT] REQUEST_ADD_ALARM for id=%u\n", localId);
    }
  }

  // 5) Finally, send ACK_SYNC_ALARM
  JsonDocument ack;
  ack["cmd"]      = "ACK_SYNC_ALARM";
  ack["from"]     = "ESP";
  ack["deviceId"] = deviceId;
  ack["status"]  = "OK";
  {
    String out;
    serializeJson(ack, out);
    publishMessage(ALARM_ACK, out, false);
  }
  return;
}

  // ─── Bulk SENSOR sync ───────────────────────────────────
  if (cmd == "SYNC_SENSOR") {
    auto arr = doc["sensors"].as<JsonArray>();
    for (JsonObject o : arr) {
      SensorSetting s{};
      s.id          = o["id"].as<uint16_t>();
      s.type        = SensorType(o["type"].as<uint8_t>());
      s.minValue    = o["minValue"].as<float>();
      s.maxValue    = o["maxValue"].as<float>();
      s.enabled     = o["enabled"].as<bool>();
      s.pending     = false;
      s.isTemporary = false;

      if (sensorExists(s.type)) {
        uint8_t cnt; auto set = Sensor::getAllSettings(cnt);
        for (uint8_t i = 0; i < cnt; ++i) {
          if (set[i].type == s.type) {
            set[i].minValue = s.minValue;
            set[i].maxValue = s.maxValue;
            set[i].enabled  = s.enabled;
            break;
          }
        }
      } else {
        Sensor::addSetting(s);
      }
    }
    Sensor::saveAllSettings();
    // send ACK_SYNC_SENSOR
    JsonDocument ack;
    ack["cmd"]      = "ACK_SYNC_SENSOR";
    ack["from"]     = "ESP";
    ack["deviceId"] = deviceId;
    ack["status"]  = "OK";
    String out; serializeJson(ack,out);
    publishMessage(SENSOR_ACK,out,false);
    return;
  }

  // ─── ACK_* handlers ─────────────────────────────────────
  if (cmd.startsWith("ACK_")) {
    handleAck(doc);
    return;
  }

  // ─── Single‐item BACKEND commands ───────────────────────
  handleCommands(doc);
}

// ────────── Handler definitions ───────────────────────────

// ACK handler (alarms & sensors)
void handleAck(JsonDocument& doc) {
  String cmd = doc["cmd"].as<const char*>();

  // Alarm ACKs: clear pending, then trySyncPending()
  if (cmd.endsWith("ALARM")) {
    uint8_t cnt; auto arr = Alarm::getAll(cnt);
    if (cmd == "ACK_ADD_ALARM") {
      auto newId    = doc["alarm"]["id"].as<uint16_t>();
      auto tempIdx  = doc["tempIndex"].as<int>();
      for (uint8_t i = 0; i < cnt; ++i) {
        if (arr[i].isTemporary && arr[i].tempIndex == tempIdx) {
          arr[i].id        = newId;
          arr[i].isTemporary = false;
          arr[i].pending   = false;
          break;
        }
      }
    } else if (cmd == "ACK_EDIT_ALARM" || cmd == "ACK_ENABLE_ALARM" || cmd == "ACK_DISABLE_ALARM") {
      auto id = doc["alarm"]["id"].as<uint16_t>();
      for (uint8_t i = 0; i < cnt; ++i) {
        if (arr[i].id == id && arr[i].pending) {
          arr[i].pending = false;
                    arr[i].isTemporary = false;

          break;
        }
      }
    } else if (cmd == "ACK_DELETE_ALARM") {
      auto id = doc["alarm"]["id"].as<uint16_t>();
      for (uint8_t i = 0; i < cnt; ++i) {
        if (arr[i].id == id && arr[i].pending) {
          // shift left
          for (uint8_t j = i; j + 1 < cnt; ++j) arr[j] = arr[j+1];
          break;
        }
      }
    }
    Alarm::saveAll();
    trySyncPending();
  }

  // Sensor ACKs: clear pending, then trySyncSensorPending()
  if (cmd.endsWith("SENSOR")) {
    Serial.println("ACK_SENSOR GAESSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS");
    auto t = doc["sensor"]["type"].as<uint8_t>();
    uint8_t cnt; auto arr = Sensor::getAllSettings(cnt);
    for (uint8_t i = 0; i < cnt; ++i) {
      if (arr[i].type == SensorType(t)) {
        arr[i].pending = false;
        arr[i].isTemporary = false;
        break;
      }
    }
    Sensor::saveAllSettings();
    trySyncSensorPending();
  }
}

// Single‐item BACKEND commands
void handleCommands(JsonDocument& doc) {
  String cmd = doc["cmd"].as<const char*>();

  // ALARM commands
  if (cmd.endsWith("ALARM")) {
    handleBackendAlarm(doc);
  }
  // SET_SENSOR
  else if (cmd == "SET_SENSOR") {
    handleSensorCommands(doc);
  }
}

// ADD/EDIT/ENABLE/DISABLE/DELETE alarm
void handleBackendAlarm(JsonDocument& doc) {
  auto id      = doc["alarm"]["id"].as<uint16_t>();
  auto hour    = doc["alarm"]["hour"].as<uint8_t>();
  auto minute  = doc["alarm"]["minute"].as<uint8_t>();
  auto duration= doc["alarm"]["duration"].as<int>();
  auto enabled = doc["alarm"]["enabled"].as<bool>();

  bool ok = false;
  String ackCmd;

  if (doc["cmd"] == "ADD_ALARM") {
    ok     = Alarm::add(id,hour,minute,duration,enabled);
    ackCmd = "ACK_ADD_ALARM";
  }
  else if (doc["cmd"] == "EDIT_ALARM") {
    ok     = Alarm::edit(id,hour,minute,duration,enabled);
    ackCmd = "ACK_EDIT_ALARM";
  }
  else if (doc["cmd"] == "ENABLE_ALARM" || doc["cmd"] == "DISABLE_ALARM") {
    if (!Alarm::exists(id)) {
      ok = true;  // pretend
      Serial.printf("[WARN] ENABLE_ALARM id=%u not found, but ACKing OK\n", id);
    } else {
      ok = Alarm::enable(id,enabled);
    }
    ackCmd = enabled ? "ACK_ENABLE_ALARM" : "ACK_DISABLE_ALARM";
  }
  else if (doc["cmd"] == "DELETE_ALARM") {
    if (!Alarm::exists(id)) {
      Serial.printf("[MQTT] Delete failed, alarm ID %u not found\n", id);
      return;
    }
    ok     = Alarm::remove(id);
    ackCmd = "ACK_DELETE_ALARM";
  }

  Alarm::saveAll();

  // send alarm‐ACK
  JsonDocument ack;
  ack["cmd"]      = ackCmd;
  ack["from"]     = "ESP";
  ack["deviceId"] = deviceId;
  ack["alarm"]["id"] = id;
  ack["status"]   = ok ? "OK" : "ERROR";

  String out; serializeJson(ack,out);
  publishMessage(ALARM_ACK,out,false);

  if (doc["cmd"] != "ADD_ALARM") {
    trySyncPending();
  }
}

// SET_SENSOR from backend
void handleSensorCommands(JsonDocument& doc) {
  auto type    = SensorType(doc["sensor"]["type"].as<uint8_t>());
  auto minV    = doc["sensor"]["minValue"].as<float>();
  auto maxV    = doc["sensor"]["maxValue"].as<float>();
  auto enabled = doc["sensor"]["enabled"].as<bool>();

  uint8_t cnt; auto arr = Sensor::getAllSettings(cnt);
  bool applied = false;
  for (uint8_t i = 0; i < cnt; ++i) {
    if (arr[i].type == type) {
      arr[i].minValue = minV;
      arr[i].maxValue = maxV;
      arr[i].enabled  = enabled;
      arr[i].pending  = false;
      arr[i].isTemporary = false;
      applied = true;
      break;
    }
  }
  Sensor::saveAllSettings();
  Serial.printf("[MQTT] SET_SENSOR %s type=%u\n", applied?"applied":"not found", (uint8_t)type);

  // send sensor‐ACK
  JsonDocument ack;
  ack["cmd"]      = "ACK_SET_SENSOR";
  ack["from"]     = "ESP";
  ack["deviceId"] = deviceId;
  ack["sensor"]["type"] = (uint8_t)type;
  ack["status"]   = applied ? "OK" : "ERROR";
  ack["message"]  = applied ? "Applied" : "NotFound";

  String out; serializeJson(ack,out);
  publishMessage(SENSOR_ACK,out,false);
}


void setupMQTT(const char *devId)
{
  deviceId = String(devId);
  secureClient.setInsecure();
  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
}

void loopMQTT()
{
  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println("[MQTT] WiFi not connected, retrying...");
    return;
  }
  if (!mqttClient.connected())
  {
    static unsigned long lastRetry = 0;
    unsigned long now = millis();
    if (now - lastRetry < 5000)
      return;
    lastRetry = now;
    String clientId = "ESP32Client-" + String(now);
    if (mqttClient.connect(clientId.c_str(), MQTT_USERNAME, MQTT_PASSWORD))
    {
      Serial.println("[MQTT] Connected, subscribing...");
      for (auto name : MESSAGE_NAMES)
      {
        String topic = String(TOPIC_PREFIX) + "/" + name + "/" + TOPIC_SUFFIX;
        mqttClient.subscribe(topic.c_str());
      }
      publishAllSensorSettings();
      trySyncSensorPending();
      trySyncPending();
    }
    else
    {
      Serial.printf("[MQTT] Connect failed, rc=%d\n", mqttClient.state());
    }
  }
  else
  {
    mqttClient.loop();
  }
}

void publishSensor(float tds, float ph, float turbidity, float temperature)
{
  JsonDocument doc;
  doc["deviceId"] = deviceId;
  doc["tds"] = tds;
  doc["ph"] = ph;
  doc["turbidity"] = turbidity;
  doc["temperature"] = temperature;
  String out;
  serializeJson(doc, out);
  if (publishMessage(SENSOR_DATA, out, false))
  {
    Serial.print("[MQTT] Published sensor: ");
    Serial.println(out);
  }
}
// --------------------------------------------------
// Panggilan dari ESP (tombol/display) untuk
// menambah, edit, atau hapus alarm.
// --------------------------------------------------
void publishAlarmFromESP(const char *action, uint16_t id, uint8_t hour, uint8_t minute, int duration, bool enabled)
{
  // 1) Jika action="ADD" dan id==0, artinya offline add
  if ((strcmp(action, "ADD") == 0) && (id == 0))
  {
    // Entry sudah dibuat oleh UI, cukup tandai pending dan sinkronkan
    uint8_t cnt;
    AlarmData *arr = Alarm::getAll(cnt);
    // cari entry isTemporary paling terakhir
    for (int i = cnt - 1; i >= 0; i--)
    {
      if (arr[i].isTemporary)
      {
        arr[i].pending = true;
        break;
      }
    }
    Alarm::saveAll();
    trySyncPending();
    return;
  }

  // 2) Jika action="EDIT" (id != 0), tandai entry sebagai pending edit
  if ((strcmp(action, "EDIT") == 0) && (id != 0))
  {
    uint8_t cnt;
    AlarmData *arr = Alarm::getAll(cnt);
    for (uint8_t i = 0; i < cnt; i++)
    {
      if (arr[i].id == id)
      {
        arr[i].hour = hour;
        arr[i].minute = minute;
        arr[i].duration = duration;
        arr[i].enabled = enabled;
        arr[i].pending = true;
        arr[i].isTemporary = false;
        break;
      }
    }
    Alarm::saveAll();
    trySyncPending();
    return;
  }

  // 3) Jika action="DEL" (id != 0), tandai entry sebagai pending delete
  if ((strcmp(action, "DEL") == 0) && (id != 0))
  {
    uint8_t cnt;
    AlarmData *arr = Alarm::getAll(cnt);
    for (uint8_t i = 0; i < cnt; i++)
    {
      if (arr[i].id == id)
      {
        arr[i].pending = true;
        arr[i].isTemporary = false;
        break;
      }
    }
    Alarm::saveAll();
    trySyncPending();
    return;
  }
}
// --------------------------------------------------
// Menghapus alarm secara lokal dan memberitahu backend
// --------------------------------------------------
void deleteAlarmFromESPByIndex(uint8_t index)
{
  uint8_t cnt;
  AlarmData *arr = Alarm::getAll(cnt);
  if (index >= cnt)
  {
    Serial.printf("[MQTT] Delete failed, invalid index %u\n", index);
    return;
  }
  uint16_t id = arr[index].id;

  // Hapus di LittleFS & simpan
  bool ok = Alarm::remove(id);
  Alarm::saveAll();
  Serial.printf("[MQTT] Removed alarm index=%u id=%u: %s\n",
                index, id, ok ? "OK" : "ERROR");

  // Kirim REQUEST_DEL
  JsonDocument doc;
  doc["cmd"] = "REQUEST_DELETE_ALARM";
  doc["from"] = "ESP";
  doc["deviceId"] = deviceId;
  JsonObject a = doc.createNestedObject("alarm");
  a["id"] = id;
  String out;
  serializeJson(doc, out);
  publishMessage(ALARM_SET, out, false); // alarmset
  Serial.printf("[MQTT] Sent delete to backend: %s\n", out.c_str());
}
void publishSensorFromESP(const SensorSetting &s)
{
  JsonDocument doc;
  doc["cmd"] = "SET_SENSOR";
  doc["from"] = "ESP";
  doc["deviceId"] = deviceId;
  JsonObject ss = doc.createNestedObject("sensor");
  ss["type"] = (int)s.type;
  ss["minValue"] = s.minValue;
  ss["maxValue"] = s.maxValue;
  ss["enabled"] = s.enabled;

  String out;
  serializeJson(doc, out);
  publishMessage(SENSOR_SET, out, false); // mids[3] == "sensorset"

  Serial.print("[MQTT] Sent ESP->backend (sensor): ");
  Serial.println(out);
}
// --------------------------------------------------
// Coba sinkron entry yang masih pending (ADD/EDIT/DELETE)
// --------------------------------------------------
void trySyncPending()
{
  uint8_t cnt;
  AlarmData *arr = Alarm::getAll(cnt);

  for (uint8_t i = 0; i < cnt; i++)
  {
    if (!arr[i].pending)
      continue;
    // 1) Jika isTemporary==true → kirim REQUEST_ADD (backend yang assign ID)
    if (arr[i].isTemporary)
    {
      JsonDocument doc;
      doc["cmd"] = "REQUEST_ADD_ALARM";
      doc["from"] = "ESP";
      doc["deviceId"] = deviceId;
      JsonObject o = doc["alarm"].to<JsonObject>();
      o["hour"] = arr[i].hour;
      o["minute"] = arr[i].minute;
      o["duration"] = arr[i].duration;
      o["enabled"] = arr[i].enabled;
      doc["tempIndex"] = arr[i].tempIndex;

      String out;
      serializeJson(doc, out);
      publishMessage(ALARM_SET, out, false); // mids[1] == "alarmset"
    }
    // 2) Jika isTemporary==false → kirim REQUEST_EDIT
    else
    {
      JsonDocument doc;
      doc["cmd"] = "REQUEST_EDIT_ALARM";
      doc["from"] = "ESP";
      doc["deviceId"] = deviceId;
      JsonObject o = doc["alarm"].to<JsonObject>();
      o["id"] = arr[i].id;
      o["hour"] = arr[i].hour;
      o["minute"] = arr[i].minute;
      o["duration"] = arr[i].duration;
      o["enabled"] = arr[i].enabled;

      String out;
      serializeJson(doc, out);
      publishMessage(ALARM_SET, out, false); // mids[1] == "alarmset"
    }
    break;
  }
}

void trySyncSensorPending()
{
  uint8_t cnt;
  SensorSetting *arr = Sensor::getAllSettings(cnt);
  for (uint8_t i = 0; i < cnt; i++)
  {
    auto &s = arr[i];
    if (!s.pending)
      continue;

    JsonDocument doc;
    doc["cmd"] = "SET_SENSOR";
    doc["from"] = "ESP";
    doc["deviceId"] = deviceId;

    JsonObject o = doc["sensor"].to<JsonObject>();
    if (!s.isTemporary)
      o["id"] = s.id;
    else
      doc["tempIndex"] = s.tempIndex;
    o["type"] = (int)s.type;
    o["minValue"] = s.minValue;
    o["maxValue"] = s.maxValue;
    o["enabled"] = s.enabled;

    String out;
    serializeJson(doc, out);
    publishMessage(SENSOR_SET, out, false); // mids[3] == "sensorset"
    break;
  }
}

void publishAllSensorSettings()
{
  // Bangun JSON payload
  uint8_t cnt;
  SensorSetting *ss = Sensor::getAllSettings(cnt);

  JsonDocument doc;
  doc["cmd"] = "INIT_SENSOR";
  doc["from"] = "ESP";
  doc["deviceId"] = deviceId;

  JsonArray arr = doc.createNestedArray("sensor");
  for (uint8_t i = 0; i < cnt; i++)
  {
    JsonObject o = arr.createNestedObject();
    o["id"] = ss[i].id;
    o["type"] = ss[i].type;
    o["minValue"] = ss[i].minValue;
    o["maxValue"] = ss[i].maxValue;
    o["enabled"] = ss[i].enabled;
  }

  String out;
  serializeJson(doc, out);

  bool ok = publishMessage(SENSOR_SET, out, true); // mids[3]=="sensorset"
  Serial.printf("[MQTT] Sent INIT_SENSOR (all): %s, success=%s\n",
                out.c_str(), ok ? "true" : "false");

  Sensor::saveAllSettings();
}
