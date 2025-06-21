// MQTT.cpp
#define MQTT_MAX_PACKET_SIZE 512 // ← Naikkan dari default 128
#include "secrets.h"
#include "MQTT.h"
#include <PubSubClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h> 
#include <ArduinoJson.h>
#include "Alarm.h"
#include "ReadSensor.h"
static WiFiClientSecure wclient;
static PubSubClient client(wclient);
static String g_deviceId;
static const char *prefix = "AkhyarAzamta";
static const char *suffix = "IoTWebApp";

bool publishMid(const char *mid, const String &payload, bool retain)
{
    if (!client.connected()) {
    return false;
  }
  String topic = String(prefix) + "/" + mid + "/" + suffix;
  // langsung kembalikan hasil client.publish
  return client.publish(
      topic.c_str(),
      (const uint8_t *)payload.c_str(),
      payload.length(),
      retain);
}

const char *mids[] = {
    "sensordata", "alarmset", "alarmack", "sensorset", "sensorack"};
void mqttCallback(char *topic, byte *payload, unsigned int len)
{
  JsonDocument doc;
  auto err = deserializeJson(doc, payload, len);
  if (err)
  {
    Serial.print("[MQTT] JSON parse error: ");
    Serial.println(err.c_str());
    return;
  }

  String cmd = doc["cmd"].as<const char *>();
  String from = doc["from"].as<const char *>();
  String device = doc["deviceId"].as<const char *>();

  // 2) Tangani ACK_ADD_ALARM (backend mengirim ID final untuk entri offline)
  if (cmd == "ACK_ADD_ALARM" && from == "BACKEND" && device == g_deviceId)
  {
    uint16_t newId = doc["alarm"]["id"];
    int tempIndex = doc["tempIndex"].as<int>();

    // Ambil array alarm + jumlahnya
    uint8_t cnt;
    AlarmData *arr = Alarm::getAll(cnt);

    // Cari entri sementara (isTemporary==true) yang memiliki tempIndex tersebut
    for (uint8_t i = 0; i < cnt; i++)
    {
      if (arr[i].isTemporary && arr[i].tempIndex == tempIndex)
      {
        // Ganti ID sementara dengan ID final
        arr[i].id = newId;
        arr[i].isTemporary = false;
        arr[i].pending = false; // sudah sinkron dengan backend
        break;
      }
    }

    // Simpan perubahan ke LittleFS
    Alarm::saveAll();
    // Setelah menerima satu ACK_ADD_ALARM, coba sinkron entry berikutnya
    trySyncPending();
    return;
  }

  // 3) Tangani ACK_EDIT_ALARM (backend men‐ack edit)
  else if (cmd == "ACK_EDIT_ALARM" && from == "BACKEND" && device == g_deviceId)
  {
    uint16_t id = doc["alarm"]["id"];

    uint8_t cnt;
    AlarmData *arr = Alarm::getAll(cnt);
    for (uint8_t i = 0; i < cnt; i++)
    {
      if (arr[i].id == id && arr[i].pending)
      {
        arr[i].pending = false;
        break;
      }
    }
    Alarm::saveAll();
    trySyncPending();
    return;
  }

  // 4) Tangani ACK_DELETE_ALARM (backend men‐ack penghapusan)
  else if (cmd == "ACK_DELETE_ALARM" && from == "BACKEND" && device == g_deviceId)
  {
    uint16_t id = doc["alarm"]["id"];
    // deleteAlarmFromESP
    uint8_t cnt;
    AlarmData *arr = Alarm::getAll(cnt);
    for (uint8_t i = 0; i < cnt; i++)
    {
      if (arr[i].id == id && arr[i].pending)
      {
        // Hapus entry i dari array
        for (uint8_t j = i; j < cnt - 1; j++)
        {
          arr[j] = arr[j + 1];
        }
        break;
      }
    }
    Alarm::saveAll();
    trySyncPending();
    return;
  }

  // 5) Tangani SET_ALARM langsung dari backend (misalnya user meng‐set via web)
  else if (cmd == "ADD_ALARM" && from == "BACKEND" && device == g_deviceId)
  {
    uint16_t id = doc["alarm"]["id"];
    uint8_t hour = doc["alarm"]["hour"];
    uint8_t minute = doc["alarm"]["minute"];
    int duration = doc["alarm"]["duration"];
    bool enabled = doc["alarm"]["enabled"];

    bool ok;
    ok = Alarm::add(id, hour, minute, duration, enabled);
    Alarm::saveAll();

    // Kirim ACK balik ke backend (opsional)
    JsonDocument ack;
    ack["cmd"] = "ACK_ADD_ALARM";
    ack["from"] = "ESP";
    ack["deviceId"] = g_deviceId;
    ack["alarm"]["id"] = id;
    ack["status"] = ok ? "OK" : "ERROR";

    String outAck;
    serializeJson(ack, outAck);
    publishMid(mids[2], outAck, false); // mids[2] == "alarmack"
    return;
  }

  else if (cmd == "EDIT_ALARM" && from == "BACKEND" && device == g_deviceId)
  {
    uint16_t id = doc["alarm"]["id"];
    uint8_t hour = doc["alarm"]["hour"];
    uint8_t minute = doc["alarm"]["minute"];
    int duration = doc["alarm"]["duration"];
    bool enabled = doc["alarm"]["enabled"];

    bool ok;
    ok = Alarm::edit(id, hour, minute, duration, enabled);
    Alarm::saveAll();

    // Kirim ACK balik ke backend (opsional)
    JsonDocument ack;
    ack["cmd"] = "ACK_EDIT_ALARM";
    ack["from"] = "ESP";
    ack["deviceId"] = g_deviceId;
    ack["alarm"]["id"] = id;
    ack["status"] = ok ? "OK" : "ERROR";

    String outAck;
    serializeJson(ack, outAck);
    publishMid(mids[2], outAck, true); // mids[2] == "alarmack"
    return;
  }

  else if ((cmd == "ENABLE_ALARM" || cmd == "DISABLE_ALARM") && from == "BACKEND" && device == g_deviceId)
  {
    uint16_t id = doc["alarm"]["id"];
    bool enabled = doc["alarm"]["enabled"];

    bool ok = Alarm::enable(id, enabled);
    Alarm::saveAll();

    // Kirim ACK balik ke backend (opsional)
    JsonDocument ack;
    ack["cmd"] = enabled ? "ACK_ENABLE_ALARM" :  "ACK_DISABLE_ALARM";
    ack["from"] = "ESP";
    ack["deviceId"] = g_deviceId;
    ack["alarm"]["id"] = id;
    ack["status"] = ok ? "OK" : "ERROR";

    String outAck;
    serializeJson(ack, outAck);
    publishMid(mids[2], outAck, true); // mids[2] == "alarmack"
    return;
  }


  else if (cmd == "DELETE_ALARM" && from == "BACKEND" && device == g_deviceId)
  {
    uint16_t id = doc["alarm"]["id"];

    if (!Alarm::exists(id))
    {
      Serial.print("[MQTT] Delete failed, alarm ID ");
      Serial.print(id);
      Serial.println(" not found");
      return;
    }

    bool ok = Alarm::remove(id);
    doc["cmd"] = "ACK_DELETE_ALARM";
    doc["from"] = "ESP";
    doc["deviceId"] = g_deviceId;
    doc["status"] = ok ? "OK" : "ERROR";
    JsonObject a = doc["alarm"].to<JsonObject>();
    a["id"] = id;

    String out;
    serializeJson(doc, out);
    publishMid(mids[2], out, false); // mids[1] == "alarmack"

    Serial.println(out);
    Alarm::saveAll();
    trySyncPending();
    return;
  }

  // 6) Tangani ACK_SET_ALARM dari backend (hanya untuk logging)
  else if (cmd == "ACK_SET_ALARM" && from == "BACKEND" && device == g_deviceId)
  {
    Serial.print("[MQTT] ACK_SET_ALARM from backend: ");
    String pretty;
    serializeJsonPretty(doc, pretty);
    Serial.println(pretty);
    return;
  }
  // MQTT.cpp, di dalam fungsi mqttCallback(...), tambahkan blok:
  else if (cmd == "SET_SENSOR" && from == "BACKEND" && device == g_deviceId)
  {
    // 1. Parse data sensor from JSON
    JsonObject ss = doc["sensor"].as<JsonObject>();
    // uint16_t id = ss["id"];            // remove this
    SensorType type = SensorType(ss["type"].as<uint8_t>());
    float minV = ss["minValue"];
    float maxV = ss["maxValue"];
    bool enabled = ss["enabled"];

    // 2. Find local entry by matching on `type` instead of `id`
    uint8_t cnt;
    SensorSetting *arr = Sensor::getAllSettings(cnt);
    bool found = false;
    for (uint8_t i = 0; i < cnt; i++)
    {
      if (arr[i].type == type)
      {
        arr[i].minValue = minV;
        arr[i].maxValue = maxV;
        arr[i].enabled = enabled;
        arr[i].pending = false;
        found = true;
        break;
      }
    }

    // 3. Save back to LittleFS
    if (found)
    {
      Sensor::saveAllSettings();
      Serial.printf("[MQTT] SET_SENSOR applied to type=%u\n", (uint8_t)type);
    }
    else
    {
      Serial.printf("[MQTT] SET_SENSOR: type=%u not found\n", (uint8_t)type);
    }

    // 4. ACK back to backend, echoing the same `type`
    {
      JsonDocument ack;
      ack["cmd"] = "ACK_SET_SENSOR";
      ack["from"] = "ESP";
      ack["deviceId"] = g_deviceId;
      JsonObject s2 = ack.createNestedObject("sensor");
      s2["type"] = (uint8_t)type;
      ack["status"] = found ? "OK" : "ERROR";
      ack["message"] = found ? "Applied" : "NotFound";

      String out;
      serializeJson(ack, out);
      publishMid(mids[4], out, false); // mids[3] == "sensorset"
      Serial.print("[MQTT] Sent ACK_SET_SENSOR: ");
      Serial.println(out);
    }

    return;
  }

  else if (cmd == "ACK_SET_SENSOR" && from == "BACKEND" && device == g_deviceId)
  {
    uint16_t type = doc["sensor"]["type"];
    uint8_t cnt;
    SensorSetting *arr = Sensor::getAllSettings(cnt);
    for (uint8_t i = 0; i < cnt; i++)
    {
      auto &s = arr[i];
      if (!s.isTemporary && s.type == type)
      {
        s.pending = false;
        break;
      }
    }
    Sensor::saveAllSettings();
    trySyncSensorPending();
    return;
  }
}

void setupMQTT(const char *deviceId)
{
  g_deviceId = String(deviceId);
  wclient.setInsecure();

  client.setServer(MQTT_HOST, MQTT_PORT);
  client.setCallback(mqttCallback);
}

void loopMQTT()
{
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[MQTT] WiFi not connected, retrying...");
    return;
  }

  if (!client.connected()) {
    static unsigned long lastTry = 0;
    unsigned long now = millis();
    if (now - lastTry >= 5000) {
      lastTry = now;
      String cid = "ESP32Client-" + String(millis());
      // connect dengan username/password
      if (client.connect(cid.c_str(), MQTT_USERNAME, MQTT_PASSWORD)) {
        Serial.println("[MQTT] Connected, subscribing…");
        for (auto mid : mids) {
          String t = String(prefix) + "/" + mid + "/" + suffix;
          client.subscribe(t.c_str());
        }
        // kirim INIT dan sinkron offline
        publishAllSensorSettings();
        trySyncSensorPending();
        trySyncPending();
      } else {
        Serial.printf("[MQTT] Connect failed, rc=%d\n", client.state());
      }
    }
    return;
  }

  client.loop();
}
// Kirim data sensor (tds, ph, turbidity, temperature)
// --------------------------------------------------
void publishSensor(float tds, float ph, float turbidity, float temperature)
{
  JsonDocument doc;
  doc["deviceId"] = g_deviceId;
  doc["tds"] = tds;
  doc["ph"] = ph;
  doc["turbidity"] = turbidity;
  doc["temperature"] = temperature;

  String out;
  serializeJson(doc, out);
  publishMid(mids[0], out, false); // mids[0] == "sensordata"

  Serial.print("[MQTT] Published sensor: ");
  Serial.println(out);
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
                index, id, ok ? "OK" : "FAIL");

  // Kirim REQUEST_DEL
  JsonDocument doc;
  doc["cmd"] = "REQUEST_DELETE_ALARM";
  doc["from"] = "ESP";
  doc["deviceId"] = g_deviceId;
  JsonObject a = doc.createNestedObject("alarm");
  a["id"] = id;
  String out;
  serializeJson(doc, out);
  publishMid(mids[1], out, false); // alarmset
  Serial.printf("[MQTT] Sent delete to backend: %s\n", out.c_str());
}
// --------------------------------------------------
// Panggilan dari DisplayAlarm.cpp untuk meng‐publish
// perubahan setting sensor ke backend
// --------------------------------------------------
void publishSensorFromESP(const SensorSetting &s)
{
  JsonDocument doc;
  doc["cmd"] = "SET_SENSOR";
  doc["from"] = "ESP";
  doc["deviceId"] = g_deviceId;
  JsonObject ss = doc.createNestedObject("sensor");
  ss["type"] = (int)s.type;
  ss["minValue"] = s.minValue;
  ss["maxValue"] = s.maxValue;
  ss["enabled"] = s.enabled;

  String out;
  serializeJson(doc, out);
  publishMid(mids[3], out, true); // mids[3] == "sensorset"

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
      doc["deviceId"] = g_deviceId;
      JsonObject o = doc["alarm"].to<JsonObject>();
      o["hour"] = arr[i].hour;
      o["minute"] = arr[i].minute;
      o["duration"] = arr[i].duration;
      o["enabled"] = arr[i].enabled;
      // o["lastDayTrig"] = arr[i].lastDayTrig;
      // o["lastMinTrig"] = arr[i].lastMinTrig;
      doc["tempIndex"] = arr[i].tempIndex;

      String out;
      serializeJson(doc, out);
      publishMid(mids[1], out, false); // mids[1] == "alarmset"
    }
    // 2) Jika isTemporary==false → kirim REQUEST_EDIT
    else
    {
      JsonDocument doc;
      doc["cmd"] = "REQUEST_EDIT_ALARM";
      doc["from"] = "ESP";
      doc["deviceId"] = g_deviceId;
      JsonObject o = doc["alarm"].to<JsonObject>();
      o["id"] = arr[i].id;
      o["hour"] = arr[i].hour;
      o["minute"] = arr[i].minute;
      o["duration"] = arr[i].duration;
      o["enabled"] = arr[i].enabled;

      String out;
      serializeJson(doc, out);
      publishMid(mids[1], out, false); // mids[1] == "alarmset"
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
    doc["cmd"] = s.isTemporary ? "REQUEST_ADD_SENSOR" : "SET_SENSOR";
    doc["from"] = "ESP";
    doc["deviceId"] = g_deviceId;

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
    publishMid(mids[3], out, false); // mids[3] == "sensorset"
    break;
  }
}

void publishAllSensorSettings()
{
  // Bangun JSON payload
  uint8_t cnt;
  SensorSetting *ss = Sensor::getAllSettings(cnt);

  StaticJsonDocument<512> doc;
  doc["cmd"] = "INIT_SENSOR";
  doc["from"] = "ESP";
  doc["deviceId"] = g_deviceId;

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

  bool ok = publishMid(mids[3], out, true); // mids[3]=="sensorset"
  Serial.printf("[MQTT] Sent INIT_SENSOR (all): %s, success=%s\n",
                out.c_str(), ok ? "true" : "false");

  Sensor::saveAllSettings();
}
