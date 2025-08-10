/*
  Warnings:

  - You are about to drop the `Alarm` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Alarm" DROP CONSTRAINT "Alarm_deviceId_fkey";

-- AlterTable
ALTER TABLE "UsersDevice" ADD COLUMN     "active" TEXT;

-- DropTable
DROP TABLE "Alarm";
