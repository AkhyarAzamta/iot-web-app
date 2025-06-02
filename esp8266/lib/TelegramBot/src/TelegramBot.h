// TelegramBot.h
#ifndef TELEGRAMBOT_H
#define TELEGRAMBOT_H

#include <Arduino.h>

// Initialize and start Telegram FreeRTOS task
void initTelegramTask();

// Send a message to default chat
void sendTelegramMessage(const String& message);

// Send a message to specified chat_id
void sendTelegramMessageTo(const String& chat_id, const String& message);

#endif // TELEGRAMBOT_H