-- Language verification per video and audience per mapping (Hebrew video workbook).
ALTER TABLE "videos" ADD COLUMN "language_status" TEXT NOT NULL DEFAULT 'source_metadata';
ALTER TABLE "videos" ADD COLUMN "detected_language" TEXT;
ALTER TABLE "videos" ADD CONSTRAINT videos_language_status_check
  CHECK (language_status IN ('verified', 'source_metadata', 'conflict', 'unverified'));
ALTER TABLE "activity_video_mappings" ADD COLUMN "audience" "Audience" NOT NULL DEFAULT 'unknown';
-- existing Arabic mappings: column J of the Arabic workbook ("גננת ...") = educator
UPDATE "activity_video_mappings" SET "audience" = 'educator' WHERE "language" = 'ar';
CREATE INDEX "videos_language_status_idx" ON "videos"("language", "language_status");
