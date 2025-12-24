-- CreateTable
CREATE TABLE `user_infos` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `exportDate` DATE NOT NULL,
    `attributes` JSON NOT NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    INDEX `user_infos_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_summaries` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `date` DATE NOT NULL,
    `type` VARCHAR(100) NOT NULL,
    `value` DECIMAL(12, 4) NULL,
    `unit` VARCHAR(50) NULL,
    `exportDate` DATE NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    INDEX `daily_summaries_userId_idx`(`userId`),
    UNIQUE INDEX `daily_summaries_userId_date_type_key`(`userId`, `date`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activity_summaries` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `exportDate` DATE NOT NULL,
    `summaries` JSON NOT NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    INDEX `activity_summaries_userId_exportDate_idx`(`userId`, `exportDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
