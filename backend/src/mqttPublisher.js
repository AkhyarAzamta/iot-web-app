// mqttPublisher.js
import mqtt from "mqtt";

const PREFIX     = "AkhyarAzamta";
const TOPIC_ID   = process.env.TOPIC_ID;
const QOS        = 0;

const buildTopic = (mid) => `${PREFIX}/${mid}/${TOPIC_ID}`;

export class MqttPublisher {
  constructor(brokerUrl = "mqtt://broker.hivemq.com:1883") {
    this.client = mqtt.connect(brokerUrl);
    this.client.on("connect", () => {
      console.log("🔌 MQTT Connected");
    });
    this.client.on("error", (err) => {
      console.error("❌ MQTT Error:", err);
    });
  }

  /**
   * Publish ke topic `AkhyarAzamta/<mid>/<TOPIC_ID>`
   * @param {"sensordata"|"relay"|"sensorset"|"sensorack"|"alarmset"|"alarmack"} mid
   * @param {object|string} payload  — object akan di‐stringify
   * @param {{retain?:boolean,qos?:number}} [opts]
   */
  publish(mid, payload, opts = {}) {
    const topic = buildTopic(mid);
    const message = typeof payload === "string"
      ? payload
      : JSON.stringify(payload);

    this.client.publish(topic, message, {
      qos:        opts.qos ?? QOS,
      retain:     opts.retain ?? false
    }, (err) => {
      if (err) console.error(`❌ Publish to ${topic} failed:`, err);
    });
  }

  // shortcut methods:
  publishSensorData(data) {
    this.publish("sensordata", data);
  }
  publishRelay(command, opts) {
    // `command` = "ON" or "OFF"
    this.publish("relay", command, opts);
  }
  publishSensorSet(req) {
    // req = { cmd:"SET_SENSOR", from:"BACKEND", deviceId, sensor: … }
    this.publish("sensorset", req);
  }
  publishSensorAck(ack) {
    this.publish("sensorack", ack);
  }
  publishAlarmSet(req) {
    // req = { cmd:"REQUEST_ADD"|"REQUEST_EDIT"|"REQUEST_DEL", …}
    this.publish("alarmset", req);
  }
  publishAlarmAck(ack) {
    this.publish("alarmack", ack);
  }
}

// buat instance singleton:
export const mqttPublisher = new MqttPublisher();
