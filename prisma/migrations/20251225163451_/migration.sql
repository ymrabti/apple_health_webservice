/*
  Warnings:

  - You are about to drop the column `attributes` on the `user_infos` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `user_infos` DROP COLUMN `attributes`,
    ADD COLUMN `biologicalSex` VARCHAR(50) NULL,
    ADD COLUMN `bloodType` VARCHAR(50) NULL,
    ADD COLUMN `cardioFitnessMedicationsUse` VARCHAR(255) NULL,
    ADD COLUMN `dateOfBirth` DATE NULL,
    ADD COLUMN `fitzpatrickSkinType` VARCHAR(50) NULL;
