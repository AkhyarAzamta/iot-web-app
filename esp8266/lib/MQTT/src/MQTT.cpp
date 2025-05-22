// MQTT.cpp
#include "MQTT.h"
#include <PubSubClient.h>
#include <WiFi.h>
#include <ArduinoJson.h>
#include <Arduino.h>
#include "Alarm.h"

static WiFiClient wclient;
static PubSubClient client(wclient);
static String topicSensor, topicLed, topicAlarmSet, topicAlarmAck, topicAlarmList;
static bool subscribed = false;

void mqttCallback(char* topic, byte* payload, unsigned int len);

void setupMQTT(const char* userId, const char* deviceId) {
    topicSensor  = String(userId)+"/sensordata/"+deviceId;
    topicLed     = String(userId)+"/relay/"+deviceId;
    topicAlarmSet= String(userId)+"/alarmset/"+deviceId;
    topicAlarmList=String(userId)+"/alarmlist/"+deviceId;
    topicAlarmAck = String(userId) + "/alarmack/" + deviceId;

    client.setServer("broker.hivemq.com", 1883);
    client.setCallback(mqttCallback);
}

void loopMQTT() {
  // 1) Pastikan Wi-Fi konek
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Lost connection, reconnecting...");
    WiFi.reconnect();
    delay(500);
    return;
  }

  // 2) Cek koneksi MQTT
  if (!client.connected()) {
    Serial.println("[MQTT] Connecting to broker…");
    String clientId = String("ESP32Client-");  // unik per board
    if (client.connect(clientId.c_str())) {
      Serial.println("[MQTT] Connected!");
      client.subscribe(topicLed.c_str());
      client.subscribe(topicAlarmSet.c_str());
      Serial.printf("[MQTT] Subscribed to %s and %s\n",
                    topicLed.c_str(), topicAlarmSet.c_str());
    } else {
      Serial.printf("[MQTT] Connect failed, rc=%d. Retry in 5s\n",
                    client.state());
      delay(5000);
      return;
    }
  }

  // 3) Proses incoming & keep-alive
  client.loop();
}

void publishSensor(float tds, float ph, float turbidity) {
    JsonDocument doc;
    doc["tds"] = tds;
    doc["ph"] = ph;
    doc["turbidity"] = turbidity;
    String out;
    serializeJson(doc, out);
    Serial.print("Publishing: ");
    Serial.println(out);
    client.publish(topicSensor.c_str(), out.c_str());
}

void mqttCallback(char* topic, byte* payload, unsigned int len) {
    // Baca payload ke String
    String msg;
    for (unsigned i = 0; i < len; i++) msg += (char)payload[i];
    Serial.printf("[MQTT] Got message on topic %s: %s\n", topic, msg.c_str());

    // 1) Toggle LED
    if (String(topic) == topicLed) {
        Serial.println("[MQTT] Toggling LED");
        digitalWrite(2, msg == "ON" ? HIGH : LOW);
        return;
    }

    // 2) CRUD Alarm
    if (String(topic) == topicAlarmSet) {
        // Parse JSON
        JsonDocument d;
        DeserializationError err = deserializeJson(d, payload, len);
        // Siapkan ack JSON
        JsonDocument ack;
        if (err) {
            Serial.println("[MQTT] JSON parse error");
            ack["status"] = "ERROR";
            ack["error"]  = "Invalid JSON";
        } else {
            String action = d["action"].as<String>();
            uint16_t id   = d["id"] | 0;
            uint8_t h     = d["hour"] | 0;
            uint8_t m     = d["minute"] | 0;
            int dur       = d["duration"] | 0;

            bool ok = false;
            if (action == "ADD")    ok = Alarm::add(id, h, m, dur);
            else if (action == "EDIT") ok = Alarm::edit(id, h, m, dur);
            else if (action == "DEL")  ok = Alarm::remove(id);

            ack["action"] = action;
            ack["id"]     = id;
            ack["status"] = ok ? "OK" : "ERROR";
            ack["message"] = Alarm::getLastMessage();

        String out;
        serializeJson(ack, out);
        client.publish(topicAlarmAck.c_str(), out.c_str());
        Serial.printf("[MQTT] Sent ack: %s\n", out.c_str());
            
            // Debug listing
            Alarm::list();
        }
    }
}
