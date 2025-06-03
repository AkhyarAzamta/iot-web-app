// TelegramBot.h
#ifndef TELEGRAMBOT_H
#define TELEGRAMBOT_H

#include <Arduino.h>

// Inisialisasi dan start Telegram FreeRTOS task
void initTelegramTask();

// Enqueue pesan ke Telegram task
void sendTelegramMessage(const String& message);
void sendTelegramMessageTo(const String& chat_id, const String& message);

#endif // TELEGRAMBOT_H
