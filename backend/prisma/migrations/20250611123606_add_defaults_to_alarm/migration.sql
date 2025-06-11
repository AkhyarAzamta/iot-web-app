-- AlterTable
ALTER TABLE `alarm` MODIFY `lastDayTrig` INTEGER NOT NULL DEFAULT -1,
    MODIFY `lastMinTrig` INTEGER NOT NULL DEFAULT -1;

-- RedefineIndex
CREATE INDEX `Alarm_deviceId_idx` ON `Alarm`(`deviceId`);
DROP INDEX `Alarm_deviceId_fkey` ON `alarm`;
