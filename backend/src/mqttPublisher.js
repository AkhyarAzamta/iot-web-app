// src/mqttPublisher.js
import mqtt from 'mqtt';

// gunakan skema mqtts (TLS) dan port 8883
const BROKER_URL = {
  host: process.env.MQTT_HOST,
  port: Number(process.env.MQTT_PORT),
  protocol: process.env.MQTT_PROTOCOL,
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
};

export const TOPIC_SENSOR = "AkhyarAzamta/sensordata/IoTWebApp";
export const TOPIC_RELAY = "AkhyarAzamta/relay/IoTWebApp";
export const TOPIC_SENSSET = "AkhyarAzamta/sensorset/IoTWebApp";
export const TOPIC_SENSACK = "AkhyarAzamta/sensorack/IoTWebApp";
export const TOPIC_ALARMSET = "AkhyarAzamta/alarmset/IoTWebApp";
export const TOPIC_ALARMACK = "AkhyarAzamta/alarmack/IoTWebApp";

// Single shared MQTT client
const client = mqtt.connect(BROKER_URL);

  client.on("connect", async () => {
    console.log("🔌 MQTT Connected");
    [TOPIC_ALARMSET, TOPIC_SENSSET].forEach(t => {
      client.publish(t, "", { retain: true });
    });
    await client.subscribe([
      TOPIC_SENSOR,
      TOPIC_RELAY,
      TOPIC_SENSSET,
      TOPIC_SENSACK,
      TOPIC_ALARMSET,
      TOPIC_ALARMACK
    ]);
    console.log("📨 Subscribed to topics");
  });

client.on('error', err => {
  console.error('❌ [mqttPublisher] MQTT error:', err);
});

/**
* Publish a JSON payload to AkhyarAzamta/{topicType}/{TOPIC_ID}.
*
* @param {'sensordata'|'relay'|'sensorset'|'sensorack'|'alarmset'|'alarmack'} topicType
* @param {object} payload Plain object; will be JSON.stringified
* @param {object} [opts] Optional publish options (e.g. { retain: true })
*/
// src/mqttPublisher.js
export function publish(topicType, payload, opts = {}) {
  const topic = `AkhyarAzamta/${topicType}/IoTWebApp`;
  const message = JSON.stringify(payload);

  // default ke qos=1, retain=true untuk command‐command control
  const publishOpts = {
    qos: opts.qos ?? 1,
    retain: opts.retain ?? true,
    ...opts
  };

  client.publish(topic, message, publishOpts, err => {
    if (err) {
      console.error(`❌ [mqttPublisher] Failed to publish to ${topic}`, err);
    } else {
      console.log(`← [mqttPublisher] ${topic} ←`, message);
    }
  });
}


export { client };
