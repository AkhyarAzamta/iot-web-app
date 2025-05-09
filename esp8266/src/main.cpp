#include <ESP8266WiFi.h>
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wsign-compare"
#include <WiFiManager.h>
#pragma GCC diagnostic pop
#include <PubSubClient.h>

#define TdsSensorPin A0
#define VREF 3.3
#define SCOUNT 30
#define BASELINE_OFFSET 4.0

int analogBuffer[SCOUNT];     
int analogBufferTemp[SCOUNT];
int analogBufferIndex = 0;

float temperature = 23;
float tds = 0;

#define CONFIG_PIN    D5

const char* MQTT_BROKER = "broker.hivemq.com";
const int   MQTT_PORT   = 1883;

char deviceId[20] = "device1";
String topicSensorPub;
String topicLedSub;

WiFiClient   wifiClient;
PubSubClient mqttClient(wifiClient);

unsigned long lastPublish      = 0;
const unsigned long PUBLISH_INTERVAL = 2000;

// ────── PROTOTYPE FUNCTIONS ─────────────────────────────────────
void sampleAnalog();
float readTDS();
int getMedianNum(int bArray[], int len);
// ────────────────────────────────────────────────────────────────

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (unsigned int i = 0; i < length; i++) {
    msg += char(payload[i]);
  }
  digitalWrite(LED_BUILTIN, (msg == "ON") ? LOW : HIGH);
}

void connectMqtt() {
  while (!mqttClient.connected()) {
    String cid = String("ESP8266-") + deviceId + "-" + String(random(0xffff), HEX);
    Serial.printf("[MQTT] Connecting as %s…\n", cid.c_str());
    if (mqttClient.connect(cid.c_str())) {
      mqttClient.subscribe(topicLedSub.c_str());
      Serial.println("[MQTT] Connected & Subscribed");
    } else {
      Serial.printf("[MQTT] Failed (%d), retry in 3s\n", mqttClient.state());
      delay(3000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(CONFIG_PIN, INPUT_PULLUP);

  digitalWrite(LED_BUILTIN, HIGH);
  pinMode(TdsSensorPin, INPUT);

  delay(50);

  WiFiManager wm;
  if (digitalRead(CONFIG_PIN) == LOW) {
    Serial.println("[CONFIG] Tombol ditekan: reset settings & buka portal");
    wm.resetSettings();
    delay(100);
    wm.startConfigPortal("ESP_Config");
  }

  WiFiManagerParameter devParam("device_id", "Device ID", deviceId, 20);
  wm.addParameter(&devParam);

  if (!wm.autoConnect("ESP_Config")) {
    Serial.println("[WIFI] AutoConnect gagal, restart");
    ESP.restart();
  }

  strcpy(deviceId, devParam.getValue());
  Serial.printf("[WiFi] Connected: IP=%s, DEVICE_ID=%s\n",
                WiFi.localIP().toString().c_str(), deviceId);

  topicSensorPub = "akhyarazamta/sensordata/" + String(deviceId);
  topicLedSub    = "led/control/"      + String(deviceId);
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WIFI] Terputus, restart...");
    delay(2000);
    ESP.restart();
  }
  if (!mqttClient.connected()) {
    connectMqtt();
  }
  mqttClient.loop();

  if (millis() - lastPublish >= PUBLISH_INTERVAL) {
    lastPublish = millis();
    sampleAnalog();
    tds = readTDS();
    String payload = "{\"distance_cm\":";
           payload += String(tds, 1);
           payload += ",\"distance_inch\":";
           payload += String(tds, 1);
           payload += "}";

    if (mqttClient.publish(topicSensorPub.c_str(), payload.c_str())) {
      Serial.printf("[MQTT] Published %s → %s\n", 
                    topicSensorPub.c_str(), payload.c_str());
    } else {
      Serial.println("[MQTT] Publish failed");
    }
  }
}

void sampleAnalog() {
  analogBuffer[analogBufferIndex] = analogRead(TdsSensorPin);
  analogBufferIndex++;
  if (analogBufferIndex == SCOUNT) analogBufferIndex = 0;
}

float readTDS() {
  for (int i = 0; i < SCOUNT; i++) {
    analogBufferTemp[i] = analogBuffer[i];
  }

  float avgVoltage = getMedianNum(analogBufferTemp, SCOUNT) * VREF / 1024.0;
  float compensation = 1.0 + 0.02 * (temperature - 25.0);
  float compensatedVoltage = avgVoltage / compensation;

  float tdsRaw = (133.42 * pow(compensatedVoltage, 3) -
                  255.86 * pow(compensatedVoltage, 2) +
                  857.39 * compensatedVoltage) * 0.5;

  float correctedTds = tdsRaw - BASELINE_OFFSET;
  return correctedTds < 0 ? 0 : correctedTds;
}

int getMedianNum(int bArray[], int len) {
  int bTab[len];
  for (byte i = 0; i < len; i++) bTab[i] = bArray[i];

  for (int j = 0; j < len - 1; j++) {
    for (int i = 0; i < len - j - 1; i++) {
      if (bTab[i] > bTab[i + 1]) {
        int temp = bTab[i];
        bTab[i] = bTab[i + 1];
        bTab[i + 1] = temp;
      }
    }
  }

  return (len % 2 == 0)
           ? (bTab[len / 2] + bTab[len / 2 - 1]) / 2
           : bTab[len / 2];
}
