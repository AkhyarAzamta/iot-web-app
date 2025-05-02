#include <ESP8266WiFi.h>

// matikan warning sign-compare saat include WiFiManager
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wsign-compare"
#include <WiFiManager.h>
#pragma GCC diagnostic pop

#include <PubSubClient.h>

#define CONFIG_PIN    D5       // Tombol konfigurasi
#define TRIG_PIN      D6       // Sesuaikan jika perlu (misal D6/GPIO12)
#define ECHO_PIN      D7       // Sesuaikan jika perlu (misal D7/GPIO13)
#define SOUND_VELOCITY 0.034   // cm/µs
#define CM_TO_INCH     0.393701

const char* MQTT_BROKER = "broker.hivemq.com";
const int   MQTT_PORT   = 1883;

char deviceId[20] = "device1";
String topicSensorPub;
String topicLedSub;

WiFiClient   wifiClient;
PubSubClient mqttClient(wifiClient);

unsigned long lastPublish      = 0;
const unsigned long PUBLISH_INTERVAL = 5000;

// Variabel sensor ultrasonik
unsigned long duration;
float distanceCm;
float distanceInch;

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
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(LED_BUILTIN, HIGH);

  delay(50);  // beri waktu pull‑up

  WiFiManager wm;
  // Jika tombol ditekan saat boot → reset settings & buka portal
  if (digitalRead(CONFIG_PIN) == LOW) {
    Serial.println("[CONFIG] Tombol ditekan: reset settings & buka portal");
    wm.resetSettings();
    delay(100);
    wm.startConfigPortal("ESP_Config");
  }

  // Tambah custom parameter Device ID
  WiFiManagerParameter devParam("device_id", "Device ID", deviceId, 20);
  wm.addParameter(&devParam);

  // Coba koneksi otomatis (atau portal jika belum pernah set)
  if (!wm.autoConnect("ESP_Config")) {
    Serial.println("[WIFI] AutoConnect gagal, restart");
    ESP.restart();
  }

  // Baca Device ID dari portal
  strcpy(deviceId, devParam.getValue());
  Serial.printf("[WiFi] Connected: IP=%s, DEVICE_ID=%s\n",
                WiFi.localIP().toString().c_str(), deviceId);

  // Setup topik MQTT
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

  // Trigger ultrasonik
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  // Hitung durasi pulse
  duration = pulseIn(ECHO_PIN, HIGH);

  // Konversi ke jarak
  distanceCm    = duration * SOUND_VELOCITY / 2.0;
  distanceInch  = distanceCm * CM_TO_INCH;

  // Publish setiap interval
  if (millis() - lastPublish >= PUBLISH_INTERVAL) {
    lastPublish = millis();

    // Buat JSON dengan nama field sesuai sensor
    String payload = "{\"distance_cm\":";
           payload += String(distanceCm, 1);
           payload += ",\"distance_inch\":";
           payload += String(distanceInch, 1);
           payload += "}";

    if (mqttClient.publish(topicSensorPub.c_str(), payload.c_str())) {
      Serial.printf("[MQTT] Published %s → %s\n", topicSensorPub.c_str(), payload.c_str());
    } else {
      Serial.println("[MQTT] Publish failed");
    }
  }
}
