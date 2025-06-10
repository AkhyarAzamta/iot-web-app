/*
  Warnings:

  - Added the required column `tds` to the `SensorData` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `sensordata` ADD COLUMN `tds` DOUBLE NOT NULL;
