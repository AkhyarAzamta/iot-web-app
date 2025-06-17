// src/mqttPublisher.js
import mqtt from 'mqtt';

const BROKER_URL = 'mqtt://broker.hivemq.com:1883';
const TOPIC_ID   = process.env.TOPIC_ID;    // your device‐specific suffix

// Single shared MQTT client
const client = mqtt.connect(BROKER_URL);

client.on('connect', () => {
  console.log('🔌 [mqttPublisher] Connected to MQTT broker');
});

client.on('error', err => {
  console.error('❌ [mqttPublisher] MQTT error:', err);
});

/**
 * Publish a JSON payload to AkhyarAzamta/{topicType}/{TOPIC_ID}.
 *
 * @param {'sensordata'|'relay'|'sensorset'|'sensorack'|'alarmset'|'alarmack'} topicType
 * @param {object} payload       Plain object; will be JSON.stringified
 * @param {object} [opts]        Optional publish options (e.g. { retain: true })
 */
// src/mqttPublisher.js
export function publish(topicType, payload, opts = {}) {
  const topic   = `AkhyarAzamta/${topicType}/${TOPIC_ID}`;
  const message = JSON.stringify(payload);

  // default ke qos=1, retain=true untuk command‐command control
  const publishOpts = {
    qos:    opts.qos    ?? 1,
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
