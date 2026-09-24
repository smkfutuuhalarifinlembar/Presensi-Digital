-- CreateTable
CREATE TABLE "NotificationLogSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "autoDeleteEnabled" BOOLEAN NOT NULL DEFAULT false,
    "intervalHours" INTEGER NOT NULL DEFAULT 1,
    "lastRunAt" TIMESTAMP(3),
    "lastDeletedCount" INTEGER NOT NULL DEFAULT 0,
    "lastTrigger" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationLogSetting_pkey" PRIMARY KEY ("id")
);