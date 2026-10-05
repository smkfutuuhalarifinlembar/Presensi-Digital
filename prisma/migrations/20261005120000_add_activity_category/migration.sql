-- Create table for activity categories (Presensi Masuk, Presensi Pulang, dll)
CREATE TABLE IF NOT EXISTS "ActivityCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ActivityCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ActivityCategory_name_key" ON "ActivityCategory"("name");

-- Seed: pastikan kategori "UMUM" selalu ada
INSERT INTO "ActivityCategory" ("id", "name", "sortOrder", "createdAt", "updatedAt")
VALUES (md5(random()::text || clock_timestamp()::text), 'UMUM', 0, NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;

-- Seed: kategori yang sedang dipakai oleh kegiatan yang sudah ada
INSERT INTO "ActivityCategory" ("id", "name", "sortOrder", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), "category", 0, NOW(), NOW()
FROM "Activity"
WHERE "category" IS NOT NULL AND "category" <> ''
GROUP BY "category"
ON CONFLICT ("name") DO NOTHING;