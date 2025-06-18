/*
  Warnings:

  - You are about to drop the column `lastDayTrig` on the `Alarm` table. All the data in the column will be lost.
  - You are about to drop the column `lastMinTrig` on the `Alarm` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Alarm` DROP COLUMN `lastDayTrig`,
    DROP COLUMN `lastMinTrig`;

-- AlterTable
ALTER TABLE `Users` ADD COLUMN `telegramChatId` VARCHAR(191) NULL;
