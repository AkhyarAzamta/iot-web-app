/*
  Warnings:

  - You are about to drop the column `humidity` on the `sensordata` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `Users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `ph` to the `SensorData` table without a default value. This is not possible if the table is not empty.
  - Added the required column `turbidity` to the `SensorData` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `Users` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `Users_username_key` ON `users`;

-- AlterTable
ALTER TABLE `sensordata` DROP COLUMN `humidity`,
    ADD COLUMN `ph` DOUBLE NOT NULL,
    ADD COLUMN `turbidity` DOUBLE NOT NULL;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `username`,
    ADD COLUMN `email` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `SensorSetting` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `deviceId` VARCHAR(191) NOT NULL,
    `type` INTEGER NOT NULL,
    `minValue` DOUBLE NOT NULL,
    `maxValue` DOUBLE NOT NULL,
    `enabled` BOOLEAN NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Users_email_key` ON `Users`(`email`);

-- AddForeignKey
ALTER TABLE `SensorSetting` ADD CONSTRAINT `SensorSetting_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `UsersDevice`(`deviceId`) ON DELETE RESTRICT ON UPDATE CASCADE;
