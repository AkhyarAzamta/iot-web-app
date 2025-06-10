/*
  Warnings:

  - You are about to drop the column `created_at` on the `sensorsetting` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `sensorsetting` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[deviceId,type]` on the table `SensorSetting` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `sensorsetting` DROP COLUMN `created_at`,
    DROP COLUMN `updated_at`,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX `SensorSetting_deviceId_type_key` ON `SensorSetting`(`deviceId`, `type`);
