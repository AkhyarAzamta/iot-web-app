#include "TelegramBot.h"
#include "Config.h"
#include <WiFiClientSecure.h>
#include <UniversalTelegramBot.h>
#include <time.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <freertos/queue.h>

// --- Credentials & instances ---
static const char* BOT_TOKEN = TELEGRAM_BOT_TOKEN;
static const char* CHAT_ID   = TELEGRAM_CHAT_ID;

static WiFiClientSecure secureClient;
static UniversalTelegramBot bot(BOT_TOKEN, secureClient);

// --- Queue for outbound messages ---
static QueueHandle_t telegramQueue = nullptr;

// Polling interval
static const TickType_t BOT_POLL_INTERVAL_TICKS = pdMS_TO_TICKS(5000);

// Internal FreeRTOS task
static void telegramTask(void* pvParameters) {
    // Setup TLS & time
#ifdef ESP32
    secureClient.setCACert(TELEGRAM_CERTIFICATE_ROOT);
#else
    secureClient.setTrustAnchors(&cert);
#endif
    configTime(0, 0, "pool.ntp.org");
    struct tm timeinfo;
    if (!getLocalTime(&timeinfo)) {
        Serial.println("[Telegram] Time sync failed");
    }
    Serial.println("[Telegram] Task started");

    char outgoing[128];
    for (;;) {
        // 1) Handle incoming updates exactly as before...
        int numNew = bot.getUpdates(bot.last_message_received + 1);
        if (numNew > 0) { /* ... */ }

        // 2) Process outbound queue
        while (uxQueueMessagesWaiting(telegramQueue) > 0) {
            if (xQueueReceive(telegramQueue, outgoing, 0) == pdTRUE) {
                bot.sendMessage(CHAT_ID, String(outgoing), "");
            }
        }

        vTaskDelay(BOT_POLL_INTERVAL_TICKS);
    }
}

void initTelegramTask() {
    // Create the queue for up to 10 messages of 128 chars
    telegramQueue = xQueueCreate(10, 128);
    configASSERT(telegramQueue != nullptr);

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

void sendTelegramMessage(const String& message) {
    if (!telegramQueue) return;
    char buf[128];
    message.toCharArray(buf, sizeof(buf));
    xQueueSend(telegramQueue, buf, 0);
}

void sendTelegramMessageTo(const String& chat_id, const String& message) {
    // You can leave this synchronous if you prefer, or also queue it
    bot.sendMessage(chat_id, message, "");
}
