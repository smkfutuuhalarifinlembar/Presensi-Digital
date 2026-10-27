-- Create tables for broadcast notification (WhatsApp ke orang tua siswa)

CREATE TABLE IF NOT EXISTS "BroadcastBatch" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'ALL',
    "institutionId" TEXT,
    "institutionName" TEXT,
    "institutionCode" TEXT,
    "targetRole" TEXT DEFAULT 'SISWA',
    "message" TEXT NOT NULL,
    "delaySeconds" INTEGER NOT NULL DEFAULT 2,
    "totalTargets" INTEGER NOT NULL DEFAULT 0,
    "withPhoneCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdByAdminId" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BroadcastBatch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BroadcastBatch_status_idx" ON "BroadcastBatch"("status");
CREATE INDEX IF NOT EXISTS "BroadcastBatch_createdAt_idx" ON "BroadcastBatch"("createdAt");
CREATE INDEX IF NOT EXISTS "BroadcastBatch_institutionId_fkey_idx" ON "BroadcastBatch"("institutionId");

CREATE TABLE IF NOT EXISTS "BroadcastMessage" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "personId" TEXT,
    "personName" TEXT,
    "nisNip" TEXT,
    "className" TEXT,
    "targetPhone" TEXT,
    "messageContent" TEXT NOT NULL,
    "provider" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "deliveryMessage" TEXT,
    "errorMessage" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "retryOfId" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BroadcastMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BroadcastMessage_batchId_idx" ON "BroadcastMessage"("batchId");
CREATE INDEX IF NOT EXISTS "BroadcastMessage_status_idx" ON "BroadcastMessage"("status");
CREATE INDEX IF NOT EXISTS "BroadcastMessage_targetPhone_idx" ON "BroadcastMessage"("targetPhone");
CREATE UNIQUE INDEX IF NOT EXISTS "BroadcastMessage_retryOfId_key" ON "BroadcastMessage"("retryOfId");

-- Foreign keys
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'BroadcastBatch' AND column_name = 'selectedClassesJson'
    ) THEN
        ALTER TABLE "BroadcastBatch" ADD COLUMN "selectedClassesJson" TEXT;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'BroadcastBatch' AND constraint_name = 'BroadcastBatch_institutionId_fkey'
    ) THEN
        ALTER TABLE "BroadcastBatch"
            ADD CONSTRAINT "BroadcastBatch_institutionId_fkey"
            FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'BroadcastMessage' AND constraint_name = 'BroadcastMessage_batchId_fkey'
    ) THEN
        ALTER TABLE "BroadcastMessage"
            ADD CONSTRAINT "BroadcastMessage_batchId_fkey"
            FOREIGN KEY ("batchId") REFERENCES "BroadcastBatch"("id") ON DELETE CASCADE;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'BroadcastMessage' AND constraint_name = 'BroadcastMessage_personId_fkey'
    ) THEN
        ALTER TABLE "BroadcastMessage"
            ADD CONSTRAINT "BroadcastMessage_personId_fkey"
            FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'BroadcastMessage' AND constraint_name = 'BroadcastMessage_retryOfId_fkey'
    ) THEN
        ALTER TABLE "BroadcastMessage"
            ADD CONSTRAINT "BroadcastMessage_retryOfId_fkey"
            FOREIGN KEY ("retryOfId") REFERENCES "BroadcastMessage"("id");
    END IF;
END
$$;
