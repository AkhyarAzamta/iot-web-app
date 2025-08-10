-- CreateEnum
CREATE TYPE "SensorType" AS ENUM ('TEMPERATURE', 'TURBIDITY', 'TDS', 'PH');

-- CreateTable
CREATE TABLE "Users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telegramChatId" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsersDevice" (
    "id" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "UsersDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensorData" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "turbidity" DOUBLE PRECISION NOT NULL,
    "tds" DOUBLE PRECISION NOT NULL,
    "ph" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SensorData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensorSetting" (
    "id" SERIAL NOT NULL,
    "deviceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "SensorType" NOT NULL,
    "minValue" DOUBLE PRECISION NOT NULL,
    "maxValue" DOUBLE PRECISION NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SensorSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alarm" (
    "id" SERIAL NOT NULL,
    "deviceId" TEXT NOT NULL,
    "hour" INTEGER NOT NULL,
    "minute" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alarm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UsersDevice_deviceName_userId_key" ON "UsersDevice"("deviceName", "userId");

-- CreateIndex
CREATE INDEX "SensorData_userId_deviceId_idx" ON "SensorData"("userId", "deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "SensorSetting_deviceId_userId_type_key" ON "SensorSetting"("deviceId", "userId", "type");

-- CreateIndex
CREATE INDEX "Alarm_deviceId_idx" ON "Alarm"("deviceId");

-- AddForeignKey
ALTER TABLE "UsersDevice" ADD CONSTRAINT "UsersDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensorData" ADD CONSTRAINT "SensorData_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensorData" ADD CONSTRAINT "SensorData_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "UsersDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensorSetting" ADD CONSTRAINT "SensorSetting_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "UsersDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alarm" ADD CONSTRAINT "Alarm_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "UsersDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
