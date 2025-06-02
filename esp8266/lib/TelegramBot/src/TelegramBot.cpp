// TelegramBot.cpp
#include "TelegramBot.h"
#include "Config.h"
#include <WiFiClientSecure.h>
#include <UniversalTelegramBot.h>
#include <time.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>

// Telegram credentials defined in Config.h
static const char* BOT_TOKEN = TELEGRAM_BOT_TOKEN;
static const char* CHAT_ID   = TELEGRAM_CHAT_ID;

// Secure client and bot instance
static WiFiClientSecure secureClient;
static UniversalTelegramBot bot(BOT_TOKEN, secureClient);

// Polling interval
static const TickType_t BOT_POLL_INTERVAL_TICKS = pdMS_TO_TICKS(5000);

// Internal task to handle incoming messages
static void telegramTask(void* pvParameters) {
    // TLS certificate
#ifdef ESP32
    secureClient.setCACert(TELEGRAM_CERTIFICATE_ROOT);
#else
    secureClient.setTrustAnchors(&cert);
#endif

    // Sync time for TLS
    configTime(0, 0, "pool.ntp.org");
    struct tm timeinfo;
    if (!getLocalTime(&timeinfo)) {
        Serial.println("[Telegram] Time sync failed");
    }
    Serial.println("[Telegram] Task started");

    for (;;) {
        int numNew = bot.getUpdates(bot.last_message_received + 1);
        if (numNew > 0) {
            Serial.printf("[Telegram] Got %d new message(s)\n", numNew);
            for (int i = 0; i < numNew; i++) {
                String chat_id = String(bot.messages[i].chat_id);
                String text    = bot.messages[i].text;
                String from    = bot.messages[i].from_name;
                if (chat_id != CHAT_ID) {
                    bot.sendMessage(chat_id, "Unauthorized", "");
                    continue;
                }
                Serial.printf("[Telegram] From %s: %s\n", from.c_str(), text.c_str());
                // handle commands
                if (text == "/start") {
                    bot.sendMessage(CHAT_ID, "Welcome " + from + "! Commands: /led_on, /led_off, /state", "");
                } else if (text == "/led_on") {
                    digitalWrite(LED_PIN, HIGH);
                    bot.sendMessage(CHAT_ID, "LED ON", "");
                } else if (text == "/led_off") {
                    digitalWrite(LED_PIN, LOW);
                    bot.sendMessage(CHAT_ID, "LED OFF", "");
                } else if (text == "/state") {
                    String state = digitalRead(LED_PIN) ? "ON" : "OFF";
                    bot.sendMessage(CHAT_ID, "LED is " + state, "");
                }
            }
        }
        vTaskDelay(BOT_POLL_INTERVAL_TICKS);
    }
}

// Initialize Telegram task
void initTelegramTask() {
    BaseType_t res = xTaskCreatePinnedToCore(
        telegramTask,
        "TelegramTask",
        8192,
        NULL,
        tskIDLE_PRIORITY + 1,
        NULL,
        0
    );
    configASSERT(res == pdPASS);
}

// Send message to default chat
void sendTelegramMessage(const String& message) {
    bot.sendMessage(CHAT_ID, message, "");
}

// Send message to specific chat ID
void sendTelegramMessageTo(const String& chat_id, const String& message) {
    bot.sendMessage(chat_id, message, "");
}
