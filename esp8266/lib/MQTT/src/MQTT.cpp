// MQTT.cpp
#include "MQTT.h"
#include <PubSubClient.h>
#include <WiFi.h>
#include <ArduinoJson.h>
#include "Alarm.h"
#include "ReadSensor.h"

//--------------------------------------------------
static WiFiClient   wclient;
static PubSubClient client(wclient);

static String topicSensor, topicLed, topicAlarmSet, topicAlarmAck, topicSensorSet;

//--------------------------------------------------
void mqttCallback(char* topic, byte* payload, unsigned int len) {
    // 1) Deserialize payload
    JsonDocument doc;
    auto err = deserializeJson(doc, payload, len);
    if (err) {
      Serial.print("[MQTT] JSON Error: ");
      Serial.println(err.c_str());
      return;
    }

    String strTopic(topic);
    // 2) Toggle LED
    if (strTopic == topicLed) {
        String cmd = doc["cmd"].as<const char*>();
        digitalWrite(2, cmd == "ON" ? HIGH : LOW);
        return;
    }

    // 3) Handle setAlarm from backend
if (strTopic == topicAlarmSet) {
    if (doc["from"] == "ESP") {
        Serial.println("[MQTT] Ignoring local ESP request");
        return;
    }

String cmd = doc["cmd"].as<const char*>();
JsonObject a = doc["alarm"];
uint16_t id    = a["id"] | 0;
uint8_t  hour  = a["hour"] | 0;
uint8_t  minute= a["minute"] | 0;
int      dur   = a["duration"] | 0;
bool      en   = a["enabled"] | true;

bool ok = false;
        if (cmd == "setAlarm") {
            if (!Alarm::exists(id)) ok = Alarm::add(id, hour, minute, dur, en);
            else                    ok = Alarm::edit(id, hour, minute, dur, en);
        }
        else if (cmd == "DEL") {
            ok = Alarm::remove(id);
        }

        Serial.printf("[MQTT] %s Alarm ID %u -> %s\n",
                      cmd.c_str(), id, ok ? "OK" : "ERR");

    // kirim ack ke backend
    JsonDocument ack;
    ack["cmd"]     = "ackSetAlarm";
    ack["from"]    = "ESP";
    ack["id"]      = id;
    ack["status"]  = ok ? "OK" : "ERROR";
    ack["message"] = Alarm::getLastMessage();
    String outAck;
    serializeJson(ack, outAck);
    client.publish(topicAlarmAck.c_str(), outAck.c_str());

    Alarm::list();
    return;
}

    // 4) Monitor ackSetAlarm from backend
    if (strTopic == topicAlarmAck) {
        // ignore our own ack
        if (doc["from"] == "ESP") return;
        Serial.print("[MQTT] ACK from backend: ");
        String pretty;
        serializeJsonPretty(doc, pretty);
        Serial.println(pretty);
        return;
    }
}

//--------------------------------------------------
void setupMQTT(char* userId, char* deviceId) {
    topicSensor   = String(userId) + "/sensordata/" + deviceId;
    topicLed      = String(userId) + "/relay/"    + deviceId;
    topicAlarmSet = String(userId) + "/alarmset/" + deviceId;
    topicAlarmAck = String(userId) + "/alarmack/" + deviceId;
    topicSensorSet = String(userId) + "/sensorset/"    + deviceId;


    client.setServer("broker.hivemq.com", 1883);
    client.setCallback(mqttCallback);
}

//--------------------------------------------------
void loopMQTT() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[MQTT] WiFi not connected, retrying...");
        WiFi.reconnect();
        delay(500);
        return;
    }
    if (!client.connected()) {
        String cid = "ESP32Client-" + String(millis());
        if (client.connect(cid.c_str())) {
            Serial.println("[MQTT] Connected, subscribing...");
            client.subscribe(topicLed.c_str());
            client.subscribe(topicAlarmSet.c_str());
            client.subscribe(topicAlarmAck.c_str());
            client.subscribe(topicAlarmSet.c_str());

      Serial.printf("[MQTT] Initial subs to %s, %s, %s\n",
                    topicLed.c_str(), topicAlarmSet.c_str(), topicAlarmAck.c_str());
        } else {
            Serial.print("[MQTT] Connect failed, rc=");
            Serial.println(client.state());
            delay(2000);
            return;
        }
    }
    client.loop();
}

//--------------------------------------------------
void publishSensor(float tds, float ph, float turbidity, float temperature) {
    JsonDocument doc;
    doc["tds"]       = tds;
    doc["ph"]        = ph;
    doc["turbidity"] = turbidity;
    doc["temperature"] = temperature;
    String out;
    serializeJson(doc, out);
    client.publish(topicSensor.c_str(), out.c_str());
    Serial.print("[MQTT] Published sensor: ");
    Serial.println(out);
}

//--------------------------------------------------
void publishAlarmFromESP(const char* action, uint16_t id, uint8_t hour, uint8_t minute, int duration, bool enabled) {
    JsonDocument doc;
    doc["cmd"]  = action;  // "ADD", "EDIT", "DEL"
    doc["from"] = "ESP";
    JsonObject a = doc["alarm"].to<JsonObject>();
    if (id) a["id"] = id;
    a["hour"]     = hour;
    a["minute"]   = minute;
    a["duration"] = duration;
    a["enabled"] = enabled;

    if (!Alarm::exists(id)) Alarm::add(id, hour, minute, duration, enabled);
    else Alarm::edit(id, hour, minute, duration, enabled);
    
    String out;
    serializeJson(doc, out);
    client.publish(topicAlarmSet.c_str(), out.c_str());
    Serial.print("[MQTT] Sent ESP->backend: ");
    Serial.println(out);
}
void publishSensorFromESP(const SensorSetting &s) {

        bool ok = Sensor::editSetting(s);
    if (!ok) {
      return ;
    }
      // Buat JSON payload
    JsonDocument doc;
      doc["cmd"]  = "SET_SENSOR";
      doc["from"] = "ESP";
    JsonObject ss = doc["sensor"].to<JsonObject>();
      ss["id"]       = s.id;
      ss["type"]     = (int)s.type;
      ss["minValue"] = s.minValue;
      ss["maxValue"] = s.maxValue;
      ss["enabled"]  = s.enabled;
    String out;
    serializeJson(doc, out);
    client.publish(topicAlarmSet.c_str(), out.c_str());
    Serial.print("[MQTT] Sent ESP->backend: ");
    Serial.println(out);
}

void deleteAlarmFromESP(uint16_t id) {
    if (!Alarm::exists(id)) {
        Serial.print("[MQTT] Delete failed, alarm ID ");
        Serial.print(id);
        Serial.println(" not found");
        return;
    }

    // Hapus dari local storage
    bool ok = Alarm::remove(id); // pastikan kamu punya fungsi ini di Alarm.cpp
    Serial.print("[MQTT] Deleted local alarm ID ");
    Serial.print(id);
    Serial.println(ok ? " OK" : " FAIL");

    // Kirim notifikasi ke backend via MQTT
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
