// MQTT.cpp
#include "MQTT.h"
#include <PubSubClient.h>
#include <WiFi.h>
#include <ArduinoJson.h>
#include "Alarm.h"
#include "ReadSensor.h"   // di sini terdapat definisi `SensorSetting`

// --------------------------------------------------
// Variabel MQTT global
// --------------------------------------------------
static WiFiClient   wclient;
static PubSubClient client(wclient);

static String topicSensor;
static String topicLed;
static String topicAlarmSet;
static String topicAlarmAck;
static String topicSensorSet;

// --------------------------------------------------
// Callback yang dipanggil ketika ada pesan masuk
// --------------------------------------------------
void mqttCallback(char* topic, byte* payload, unsigned int len) {
  // 1) Parse JSON payload
  JsonDocument doc;
  auto err = deserializeJson(doc, payload, len);
  if (err) {
    Serial.print("[MQTT] JSON parse error: ");
    Serial.println(err.c_str());
    return;
  }

  String cmd  = doc["cmd"].as<const char*>();
  String from = doc["from"].as<const char*>();

  // 2) Tangani ACK_ADD (backend mengirim ID final untuk entri offline)
  if (cmd == "ACK_ADD" && from == "BACKEND") {
    uint16_t newId     = doc["alarm"]["id"];
    int      tempIndex = doc["tempIndex"].as<int>();

    // Ambil array alarm + jumlahnya
    uint8_t cnt;
    AlarmData* arr = Alarm::getAll(cnt);

    // Cari entri sementara (isTemporary==true) yang memiliki tempIndex tersebut
    for (uint8_t i = 0; i < cnt; i++) {
      if (arr[i].isTemporary && arr[i].tempIndex == tempIndex) {
        // Ganti ID sementara dengan ID final
        arr[i].id          = newId;
        arr[i].isTemporary = false;
        arr[i].pending     = false;  // sudah sinkron dengan backend
        break;
      }
    }

    // Simpan perubahan ke LittleFS
    Alarm::saveAll();

    // Setelah menerima satu ACK_ADD, coba sinkron entry berikutnya
    trySyncPending();
    return;
  }

  // 3) Tangani ACK_EDIT (backend men‐ack edit)
  else if (cmd == "ACK_EDIT" && from == "BACKEND") {
    uint16_t id = doc["alarm"]["id"];

    uint8_t cnt;
    AlarmData* arr = Alarm::getAll(cnt);
    for (uint8_t i = 0; i < cnt; i++) {
      if (arr[i].id == id && arr[i].pending) {
        arr[i].pending = false;
        break;
      }
    }
    Alarm::saveAll();
    trySyncPending();
    return;
  }

  // 4) Tangani ACK_DELETE (backend men‐ack penghapusan)
  else if (cmd == "ACK_DELETE" && from == "BACKEND") {
    uint16_t id = doc["alarm"]["id"];

    uint8_t cnt;
    AlarmData* arr = Alarm::getAll(cnt);
    for (uint8_t i = 0; i < cnt; i++) {
      if (arr[i].id == id && arr[i].pending) {
        // Hapus entry i dari array
        for (uint8_t j = i; j < cnt - 1; j++) {
          arr[j] = arr[j+1];
        }
        break;
      }
    }
    Alarm::saveAll();
    trySyncPending();
    return;
  }

  // 5) Tangani SET_ALARM langsung dari backend (misalnya user meng‐set via web)
  else if (cmd == "SET_ALARM" && from == "BACKEND") {
    uint16_t id      = doc["alarm"]["id"];
    uint8_t hour     = doc["alarm"]["hour"];
    uint8_t minute   = doc["alarm"]["minute"];
    int     duration = doc["alarm"]["duration"];
    bool    enabled  = doc["alarm"]["enabled"];

    bool ok;
    if (!Alarm::exists(id)) {
      ok = Alarm::add(id, hour, minute, duration, enabled);
    } else {
      ok = Alarm::edit(id, hour, minute, duration, enabled);
    }
    Alarm::saveAll();

    // Kirim ACK balik ke backend (opsional)
    JsonDocument ack;
    ack["cmd"]     = "ACK_SET_ALARM";
    ack["from"]    = "ESP";
    ack["alarm"]["id"]      = id;
    ack["alarm"]["hour"]    = hour;
    ack["alarm"]["minute"]  = minute;
    ack["alarm"]["duration"]= duration;
    ack["alarm"]["enabled"] = enabled;
    ack["status"]  = ok ? "OK" : "ERROR";
    ack["message"] = Alarm::getLastMessage();

    String outAck;
    serializeJson(ack, outAck);
    client.publish(topicAlarmAck.c_str(), outAck.c_str());
    return;
  }

  // 6) Tangani ACK_SET_ALARM dari backend (hanya untuk logging)
  else if (cmd == "ACK_SET_ALARM" && from == "BACKEND") {
    Serial.print("[MQTT] ACK_SET_ALARM from backend: ");
    String pretty;
    serializeJsonPretty(doc, pretty);
    Serial.println(pretty);
    return;
  }

  // 7) Toggle LED (contoh)
  {
    String strTopic(topic);
    if (strTopic == topicLed) {
      String toggle = doc["cmd"].as<const char*>();
      digitalWrite(2, toggle == "ON" ? HIGH : LOW);
      return;
    }
  }
}

// --------------------------------------------------
// Inisialisasi koneksi MQTT (panggil di setup())
// --------------------------------------------------
void setupMQTT(char* userId, char* deviceId) {
  topicSensor   = String(userId) + "/sensordata/" + deviceId;
  topicLed      = String(userId) + "/relay/"    + deviceId;
  topicAlarmSet = String(userId) + "/alarmset/" + deviceId;
  topicAlarmAck = String(userId) + "/alarmack/" + deviceId;
  topicSensorSet= String(userId) + "/sensorset/" + deviceId;

  client.setServer("broker.hivemq.com", 1883);
  client.setCallback(mqttCallback);
}

// --------------------------------------------------
// Loop MQTT (panggil di loop() setelah WiFi terhubung)
// --------------------------------------------------
void loopMQTT() {
  // Pastikan WiFi masih terhubung
  if (WiFi.status() != WL_CONNECTED) {
    // Cukup catat di serial, jangan delay lama
    Serial.println("[MQTT] WiFi not connected, retrying...");
    // biarkan loop utama yang memanggil setupWiFi() atau WiFi.reconnect() di tempat lain
    return;  
  }

  // Jika belum terhubung ke broker, coba connect lagi TETAPI TANPA delay(2000)
  if (!client.connected()) {
    static unsigned long lastTry = 0;
    unsigned long now = millis();
    // coba connect tiap 5 detik saja (atau sesuai kebutuhan)
    if (now - lastTry >= 5000) {
      lastTry = now;
      String cid = "ESP32Client-" + String(millis());
      if (client.connect(cid.c_str())) {
        Serial.println("[MQTT] Connected, subscribing...");
        client.subscribe(topicLed.c_str());
        client.subscribe(topicAlarmSet.c_str());
        client.subscribe(topicAlarmAck.c_str());
        client.subscribe(topicSensorSet.c_str());
        Serial.printf("[MQTT] Initial subs to %s, %s, %s\n",
                      topicLed.c_str(), topicAlarmSet.c_str(), topicAlarmAck.c_str());
        trySyncPending();
      } else {
        Serial.print("[MQTT] Connect failed, rc=");
        Serial.println(client.state());
        // jangan delay, cukup tunggu hingga nextTry
      }
    }
    return; // langsung kembali ke loop utama supaya LCD & tombol tetap jalan
  }

  // Kalau sudah konek, jalankan loop biasa
  client.loop();

  // Sinkron pending entry
  trySyncPending();
}
// --------------------------------------------------
// Kirim data sensor (tds, ph, turbidity, temperature)
// --------------------------------------------------
void publishSensor(float tds, float ph, float turbidity, float temperature) {
  JsonDocument doc;
  doc["tds"]        = tds;
  doc["ph"]         = ph;
  doc["turbidity"]  = turbidity;
  doc["temperature"]= temperature;

  String out;
  serializeJson(doc, out);
  client.publish(topicSensor.c_str(), out.c_str());
  Serial.print("[MQTT] Published sensor: ");
  Serial.println(out);
}

// --------------------------------------------------
// Panggilan dari ESP (tombol/display) untuk
// menambah, edit, atau hapus alarm.
// --------------------------------------------------
void publishAlarmFromESP(const char* action,
                         uint16_t id,
                         uint8_t hour,
                         uint8_t minute,
                         int duration,
                         bool enabled) {
  // 1) Jika action="ADD" dan id==0, artinya offline add
  if ((strcmp(action, "ADD") == 0) && (id == 0)) {
    Alarm::addAlarmOffline(hour, minute, duration, enabled);
    trySyncPending();
    return;
  }

  // 2) Jika action="EDIT" (id != 0), tandai entry sebagai pending edit
  if ((strcmp(action, "EDIT") == 0) && (id != 0)) {
    uint8_t cnt;
    AlarmData* arr = Alarm::getAll(cnt);
    for (uint8_t i = 0; i < cnt; i++) {
      if (arr[i].id == id) {
        arr[i].hour        = hour;
        arr[i].minute      = minute;
        arr[i].duration    = duration;
        arr[i].enabled     = enabled;
        arr[i].pending     = true;
        arr[i].isTemporary = false;
        break;
      }
    }
    Alarm::saveAll();
    trySyncPending();
    return;
  }

  // 3) Jika action="DEL" (id != 0), tandai entry sebagai pending delete
  if ((strcmp(action, "DEL") == 0) && (id != 0)) {
    uint8_t cnt;
    AlarmData* arr = Alarm::getAll(cnt);
    for (uint8_t i = 0; i < cnt; i++) {
      if (arr[i].id == id) {
        arr[i].pending     = true;
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
void deleteAlarmFromESP(uint16_t id) {
  if (!Alarm::exists(id)) {
    Serial.print("[MQTT] Delete failed, alarm ID ");
    Serial.print(id);
    Serial.println(" not found");
    return;
  }

  // Hapus di local storage
  bool ok = Alarm::remove(id);
  Serial.print("[MQTT] Deleted local alarm ID ");
  Serial.print(id);
  Serial.println(ok ? " OK" : " FAIL");

  // Kirim notifikasi ke backend agar di‐hapus juga
  JsonDocument doc;
  doc["cmd"]  = "DEL";
  doc["from"] = "ESP";
  JsonObject a = doc["alarm"].to<JsonObject>();
  a["id"] = id;

  String out;
  serializeJson(doc, out);
  client.publish(topicAlarmSet.c_str(), out.c_str());
  Serial.print("[MQTT] Sent delete to backend: ");
  Serial.println(out);
}

// --------------------------------------------------
// Panggilan dari DisplayAlarm.cpp untuk meng‐publish
// perubahan setting sensor ke backend
// --------------------------------------------------
void publishSensorFromESP(const SensorSetting &s) {
  JsonDocument doc;
  doc["cmd"]        = "SET_SENSOR";
  doc["from"]       = "ESP";
  JsonObject ss     = doc["sensor"].to<JsonObject>();
  ss["id"]          = s.id;
  ss["type"]        = (int)s.type;
  ss["minValue"]    = s.minValue;
  ss["maxValue"]    = s.maxValue;
  ss["enabled"]     = s.enabled;

  String out;
  serializeJson(doc, out);
  client.publish(topicSensorSet.c_str(), out.c_str());
  Serial.print("[MQTT] Sent ESP->backend (sensor): ");
  Serial.println(out);
}

// --------------------------------------------------
// Coba sinkron entry yang masih pending (ADD/EDIT/DELETE)
// --------------------------------------------------
void trySyncPending() {
  uint8_t cnt;
  AlarmData* arr = Alarm::getAll(cnt);

  for (uint8_t i = 0; i < cnt; i++) {
    if (!arr[i].pending) continue;

    // 1) Jika isTemporary==true → kirim REQUEST_ADD (backend yang assign ID)
    if (arr[i].isTemporary) {
      JsonDocument doc;
      doc["cmd"]      = "REQUEST_ADD";
      doc["from"]     = "ESP";
      JsonObject o    = doc["alarm"].to<JsonObject>();
      o["hour"]       = arr[i].hour;
      o["minute"]     = arr[i].minute;
      o["duration"]   = arr[i].duration;
      o["enabled"]    = arr[i].enabled;
      doc["tempIndex"]= arr[i].tempIndex;

      String out;
      serializeJson(doc, out);
      client.publish(topicAlarmSet.c_str(), out.c_str());
    }
    // 2) Jika isTemporary==false → kirim REQUEST_EDIT
    else {
      JsonDocument doc;
      doc["cmd"]      = "REQUEST_EDIT";
      doc["from"]     = "ESP";
      JsonObject o    = doc["alarm"].to<JsonObject>();
      o["id"]         = arr[i].id;
      o["hour"]       = arr[i].hour;
      o["minute"]     = arr[i].minute;
      o["duration"]   = arr[i].duration;
      o["enabled"]    = arr[i].enabled;

      String out;
      serializeJson(doc, out);
      client.publish(topicAlarmSet.c_str(), out.c_str());
    }

    // Setelah mengirim satu REQUEST, hentikan loop—tunggu ACK
    break;
  }
}
