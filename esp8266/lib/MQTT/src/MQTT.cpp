#include "MQTT.h"
#include <PubSubClient.h>
#include <WiFi.h>
#include <ArduinoJson.h>
#include <Arduino.h>
#include "Alarm.h"

static WiFiClient wclient;
static PubSubClient client(wclient);
static String topicSensor, topicLed, topicAlarmSet, topicAlarmList;
static bool subscribed = false;

void mqttCallback(char* topic, byte* payload, unsigned int len);

void setupMQTT(const char* userId, const char* deviceId) {
    topicSensor  = String(userId)+"/sensordata/"+deviceId;
    topicLed     = String(userId)+"/relay/"+deviceId;
    topicAlarmSet= String(userId)+"/alarmset/"+deviceId;
    topicAlarmList=String(userId)+"/alarmlist/"+deviceId;
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

void publishSensor(float tds) {
    JsonDocument doc;
    doc["tds"] = tds;
    String out;
    serializeJson(doc, out);
    client.publish(topicSensor.c_str(), out.c_str());
}

void mqttCallback(char* topic, byte* payload, unsigned int len) {
    String msg;
    for (unsigned i=0;i<len;i++) msg += (char)payload[i];
        Serial.printf("[MQTT] Got message on topic %s: %s\n", topic, msg.c_str());
    if (String(topic)==topicLed) {
              Serial.println("[MQTT] Toggling LED");
        digitalWrite(2, msg=="ON"?HIGH:LOW);
    } else if (String(topic)==topicAlarmSet) {
        JsonDocument d;
        deserializeJson(d, payload, len);
        String action = d["action"];
        uint16_t id = d["id"];
        uint8_t h = d["hour"], m = d["minute"];
        int dur = d["duration"];
        if (action=="ADD") Alarm::add(id?:0, h,m,dur);
        else if (action=="EDIT") Alarm::edit(id,h,m,dur);
        else if (action=="DEL") Alarm::remove(id);
        Alarm::list();
    }
}