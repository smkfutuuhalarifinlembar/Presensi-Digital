-- Add institutionId to Holiday model
-- AlterTable
ALTER TABLE "Holiday" ADD COLUMN "institutionId" TEXT;

-- CreateIndex
CREATE INDEX "Holiday_dateString_isActive_idx" ON "Holiday"("dateString", "isActive");

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop old unique constraint on dateString, add new compound unique
-- Note: We need to drop the old unique constraint first
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Holiday_dateString_key') THEN
    ALTER TABLE "Holiday" DROP CONSTRAINT "Holiday_dateString_key";
  END IF;
END $$;

CREATE UNIQUE INDEX "Holiday_dateString_institutionId_key" ON "Holiday"("dateString", "institutionId") WHERE isActive = true;