// src/mqttPublisher.js
import mqtt from 'mqtt';

// Gunakan WebSocket Secure (WSS) untuk kompatibilitas dengan Vercel
const BROKER_URL = {
  protocol: 'wss',
  host: process.env.MQTT_HOST,
  port: 8884, // Gunakan port WebSocket khusus
  path: '/mqtt', // Path wajib untuk HiveMQ Cloud
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  reconnectPeriod: 5000,
  connectTimeout: 30000,
  rejectUnauthorized: false
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
  console.log('✅ [mqttPublisher] Connected to MQTT broker');
  
  // Clear retained messages
  [TOPIC_ALARMSET, TOPIC_SENSSET].forEach(t => {
    client.publish(t, "", { retain: true });
  });
  
  // Subscribe to topics
  const topics = [
    TOPIC_SENSOR,
    TOPIC_RELAY,
    TOPIC_SENSSET,
    TOPIC_SENSACK,
    TOPIC_ALARMSET,
    TOPIC_ALARMACK
  ];
  
  await client.subscribe(topics, (err) => {
    if (err) {
      console.error('❌ [mqttPublisher] Subscription error:', err);
    } else {
      console.log(`✅ [mqttPublisher] Subscribed to ${topics.length} topics`);
    }
  });
});

client.on('error', err => {
  console.error('❌ [mqttPublisher] MQTT error:', err);
});

client.on('close', () => {
  console.log('🔌 [mqttPublisher] Connection closed');
});

client.on('offline', () => {
  console.log('📴 [mqttPublisher] Client offline');
});

/**
* Publish a JSON payload to AkhyarAzamta/{topicType}/IoTWebApp.
*
* @param {'sensordata'|'relay'|'sensorset'|'sensorack'|'alarmset'|'alarmack'} topicType
* @param {object} payload Plain object; will be JSON.stringified
* @param {object} [opts] Optional publish options (e.g. { retain: true })
*/
export function publish(topicType, payload, opts = {}) {
  const topic = `AkhyarAzamta/${topicType}/IoTWebApp`;
  const message = JSON.stringify(payload);

  const publishOpts = {
    qos: opts.qos ?? 1,
    retain: opts.retain ?? true,
    ...opts
  };

  if (!client.connected) {
    console.error(`❌ [mqttPublisher] Not connected, cannot publish to ${topic}`);
    return;
  }

  client.publish(topic, message, publishOpts, err => {
    if (err) {
      console.error(`❌ [mqttPublisher] Failed to publish to ${topic}`, err);
    } else {
      console.log(`← [mqttPublisher] ${topic} ←`, message);
    }
  });
}

export { client };