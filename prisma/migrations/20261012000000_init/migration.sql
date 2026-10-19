-- Extensions required by the schema (pgvector for embeddings, pg_trgm for fuzzy title search).
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('PDF', 'XLSX');

-- CreateEnum
CREATE TYPE "DocumentLanguage" AS ENUM ('he', 'ar', 'multilingual');

-- CreateEnum
CREATE TYPE "ContentLanguage" AS ENUM ('he', 'ar');

-- CreateEnum
CREATE TYPE "VideoLanguage" AS ENUM ('he', 'ar', 'unknown');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('active', 'draft', 'archived');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('unreviewed', 'needs_review', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('complete', 'partial', 'failed', 'manual');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('video_segment', 'handbook_exercise');

-- CreateEnum
CREATE TYPE "ActivityRole" AS ENUM ('overview', 'exercise', 'parent_guidance', 'note');

-- CreateEnum
CREATE TYPE "Audience" AS ENUM ('educator', 'parent', 'both', 'unknown');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('exact_activity', 'milestone_overview', 'parent_guidance', 'supporting_instruction', 'requires_review');

-- CreateEnum
CREATE TYPE "ConfidenceStatus" AS ENUM ('verified', 'source_asserted', 'needs_review', 'conflict');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('unchecked', 'available', 'unavailable', 'error');

-- CreateEnum
CREATE TYPE "ImportJobType" AS ENUM ('video_workbook', 'pdf_handbook');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('queued', 'parsing', 'staged', 'validated', 'publishing', 'published', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('info', 'warning', 'error', 'critical');

-- CreateEnum
CREATE TYPE "RowStatus" AS ENUM ('valid', 'invalid', 'duplicate', 'skipped');

-- CreateEnum
CREATE TYPE "RowAction" AS ENUM ('insert', 'update', 'unchanged', 'conflict', 'none');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'editor', 'viewer');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('user', 'assistant');

-- CreateEnum
CREATE TYPE "BookmarkType" AS ENUM ('milestone', 'activity', 'video');

-- CreateTable
CREATE TABLE "source_documents" (
    "id" UUID NOT NULL,
    "document_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "source_type" "SourceType" NOT NULL,
    "language" "DocumentLanguage" NOT NULL,
    "original_filename" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "current_version_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "source_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_versions" (
    "id" UUID NOT NULL,
    "source_document_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "imported_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "import_status" "ImportStatus" NOT NULL,
    "page_count" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "source_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "age_groups" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "min_age_months" DECIMAL(6,3) NOT NULL,
    "max_age_months" DECIMAL(6,3) NOT NULL,
    "min_age_weeks" INTEGER,
    "display_order" INTEGER NOT NULL,
    "label_he" TEXT NOT NULL,
    "label_ar" TEXT NOT NULL,
    "source_text_he" TEXT,
    "source_text_ar" TEXT,
    "chapter_number" INTEGER NOT NULL,

    CONSTRAINT "age_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" UUID NOT NULL,
    "milestone_code" TEXT NOT NULL,
    "age_group_id" UUID NOT NULL,
    "development_domain" TEXT,
    "display_order" INTEGER NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestone_translations" (
    "id" UUID NOT NULL,
    "milestone_id" UUID NOT NULL,
    "language" "ContentLanguage" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "developmental_explanation" TEXT,
    "expected_age_text" TEXT,
    "educational_guidance" TEXT,
    "additional_notes" TEXT,
    "source_age_text" TEXT,
    "source_origin" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "source_version_id" UUID NOT NULL,
    "content_review_status" "ReviewStatus" NOT NULL DEFAULT 'unreviewed',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "milestone_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" UUID NOT NULL,
    "milestone_id" UUID NOT NULL,
    "activity_code" TEXT NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "activity_type" "ActivityType" NOT NULL,
    "role" "ActivityRole" NOT NULL DEFAULT 'exercise',
    "audience" "Audience" NOT NULL DEFAULT 'unknown',
    "status" "RecordStatus" NOT NULL DEFAULT 'active',
    "source_attributes" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_translations" (
    "id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "language" "ContentLanguage" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "precautions" TEXT,
    "source_origin" TEXT NOT NULL,
    "source_version_id" UUID NOT NULL,
    "verification_status" "ReviewStatus" NOT NULL DEFAULT 'unreviewed',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "activity_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_links" (
    "id" UUID NOT NULL,
    "segment_id" UUID NOT NULL,
    "exercise_id" UUID NOT NULL,
    "link_type" "RelationshipType" NOT NULL,
    "confidence" "ConfidenceStatus" NOT NULL,
    "method" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "activity_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "videos" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_video_id" TEXT NOT NULL,
    "canonical_url" TEXT NOT NULL,
    "embed_url" TEXT NOT NULL,
    "title" TEXT,
    "language" "VideoLanguage" NOT NULL DEFAULT 'unknown',
    "language_evidence" JSONB NOT NULL DEFAULT '[]',
    "video_type" TEXT NOT NULL DEFAULT 'instructional',
    "availability_status" "AvailabilityStatus" NOT NULL DEFAULT 'unchecked',
    "provider_title" TEXT,
    "last_checked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_video_mappings" (
    "id" UUID NOT NULL,
    "mapping_key" TEXT NOT NULL,
    "milestone_id" UUID NOT NULL,
    "activity_id" UUID,
    "video_id" UUID NOT NULL,
    "language" "VideoLanguage" NOT NULL,
    "mapping_type" "RelationshipType" NOT NULL,
    "source_document_id" UUID NOT NULL,
    "source_version_id" UUID NOT NULL,
    "source_sheet" TEXT NOT NULL,
    "source_row_number" INTEGER NOT NULL,
    "raw_milestone_code" TEXT,
    "raw_sub_milestone_code" TEXT,
    "raw_correlation_text" TEXT,
    "raw_video_value" TEXT,
    "confidence_status" "ConfidenceStatus" NOT NULL,
    "validation_notes" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "activity_video_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_references" (
    "id" UUID NOT NULL,
    "source_version_id" UUID NOT NULL,
    "milestone_id" UUID NOT NULL,
    "activity_id" UUID,
    "language" "ContentLanguage" NOT NULL,
    "pdf_page_index" INTEGER NOT NULL,
    "printed_page_number" INTEGER,
    "section_heading" TEXT,
    "source_excerpt" TEXT,
    "extraction_status" "ExtractionStatus" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_chunks" (
    "id" UUID NOT NULL,
    "source_version_id" UUID NOT NULL,
    "milestone_id" UUID NOT NULL,
    "activity_id" UUID,
    "language" "ContentLanguage" NOT NULL,
    "chunk_type" TEXT NOT NULL,
    "text_content" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "embedding" vector(384),
    "embedding_model" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" UUID NOT NULL,
    "job_type" "ImportJobType" NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'queued',
    "language" "VideoLanguage",
    "source_document_id" UUID,
    "source_version_id" UUID,
    "original_filename" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "mapping_profile" JSONB,
    "stats" JSONB NOT NULL DEFAULT '{}',
    "error_message" TEXT,
    "created_by_id" UUID,
    "published_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_issues" (
    "id" UUID NOT NULL,
    "import_job_id" UUID,
    "source_document_id" UUID,
    "source_file" TEXT NOT NULL,
    "worksheet" TEXT,
    "row_number" INTEGER,
    "page_index" INTEGER,
    "severity" "IssueSeverity" NOT NULL,
    "code" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_by_id" UUID,
    "resolved_at" TIMESTAMPTZ(6),
    "resolution_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_row_records" (
    "id" UUID NOT NULL,
    "import_job_id" UUID NOT NULL,
    "worksheet" TEXT NOT NULL,
    "row_number" INTEGER NOT NULL,
    "raw" JSONB NOT NULL,
    "normalized" JSONB,
    "status" "RowStatus" NOT NULL,
    "action" "RowAction" NOT NULL DEFAULT 'none',
    "target_key" TEXT,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_row_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'viewer',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "client_id" TEXT NOT NULL,
    "language" "ContentLanguage" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookmarks" (
    "id" UUID NOT NULL,
    "client_id" TEXT NOT NULL,
    "item_type" "BookmarkType" NOT NULL,
    "item_key" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_log" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "application_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "source_documents_document_key_key" ON "source_documents"("document_key");

-- CreateIndex
CREATE UNIQUE INDEX "source_documents_current_version_id_key" ON "source_documents"("current_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "source_versions_source_document_id_version_number_key" ON "source_versions"("source_document_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "source_versions_source_document_id_checksum_key" ON "source_versions"("source_document_id", "checksum");

-- CreateIndex
CREATE UNIQUE INDEX "age_groups_code_key" ON "age_groups"("code");

-- CreateIndex
CREATE UNIQUE INDEX "age_groups_chapter_number_key" ON "age_groups"("chapter_number");

-- CreateIndex
CREATE UNIQUE INDEX "milestones_milestone_code_key" ON "milestones"("milestone_code");

-- CreateIndex
CREATE INDEX "milestones_age_group_id_idx" ON "milestones"("age_group_id");

-- CreateIndex
CREATE INDEX "milestones_development_domain_idx" ON "milestones"("development_domain");

-- CreateIndex
CREATE INDEX "milestone_translations_language_is_primary_idx" ON "milestone_translations"("language", "is_primary");

-- CreateIndex
CREATE UNIQUE INDEX "milestone_translations_milestone_id_language_source_version_key" ON "milestone_translations"("milestone_id", "language", "source_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "activities_activity_code_key" ON "activities"("activity_code");

-- CreateIndex
CREATE INDEX "activities_milestone_id_activity_type_sequence_number_idx" ON "activities"("milestone_id", "activity_type", "sequence_number");

-- CreateIndex
CREATE INDEX "activities_audience_idx" ON "activities"("audience");

-- CreateIndex
CREATE INDEX "activity_translations_language_idx" ON "activity_translations"("language");

-- CreateIndex
CREATE UNIQUE INDEX "activity_translations_activity_id_language_source_version_i_key" ON "activity_translations"("activity_id", "language", "source_version_id");

-- CreateIndex
CREATE INDEX "activity_links_exercise_id_idx" ON "activity_links"("exercise_id");

-- CreateIndex
CREATE UNIQUE INDEX "activity_links_segment_id_exercise_id_key" ON "activity_links"("segment_id", "exercise_id");

-- CreateIndex
CREATE INDEX "videos_language_idx" ON "videos"("language");

-- CreateIndex
CREATE UNIQUE INDEX "videos_provider_provider_video_id_key" ON "videos"("provider", "provider_video_id");

-- CreateIndex
CREATE UNIQUE INDEX "activity_video_mappings_mapping_key_key" ON "activity_video_mappings"("mapping_key");

-- CreateIndex
CREATE INDEX "activity_video_mappings_milestone_id_language_is_active_idx" ON "activity_video_mappings"("milestone_id", "language", "is_active");

-- CreateIndex
CREATE INDEX "activity_video_mappings_activity_id_language_is_active_idx" ON "activity_video_mappings"("activity_id", "language", "is_active");

-- CreateIndex
CREATE INDEX "activity_video_mappings_video_id_idx" ON "activity_video_mappings"("video_id");

-- CreateIndex
CREATE INDEX "activity_video_mappings_source_document_id_source_sheet_sou_idx" ON "activity_video_mappings"("source_document_id", "source_sheet", "source_row_number");

-- CreateIndex
CREATE INDEX "source_references_milestone_id_language_idx" ON "source_references"("milestone_id", "language");

-- CreateIndex
CREATE INDEX "source_references_activity_id_idx" ON "source_references"("activity_id");

-- CreateIndex
CREATE INDEX "knowledge_chunks_milestone_id_language_idx" ON "knowledge_chunks"("milestone_id", "language");

-- CreateIndex
CREATE INDEX "knowledge_chunks_language_chunk_type_idx" ON "knowledge_chunks"("language", "chunk_type");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_chunks_source_version_id_content_hash_key" ON "knowledge_chunks"("source_version_id", "content_hash");

-- CreateIndex
CREATE INDEX "import_jobs_status_created_at_idx" ON "import_jobs"("status", "created_at");

-- CreateIndex
CREATE INDEX "import_issues_import_job_id_severity_idx" ON "import_issues"("import_job_id", "severity");

-- CreateIndex
CREATE INDEX "import_issues_is_resolved_severity_idx" ON "import_issues"("is_resolved", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "import_row_records_import_job_id_worksheet_row_number_key" ON "import_row_records"("import_job_id", "worksheet", "row_number");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "conversations_client_id_updated_at_idx" ON "conversations"("client_id", "updated_at");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "bookmarks_client_id_item_type_item_key_key" ON "bookmarks"("client_id", "item_type", "item_key");

-- CreateIndex
CREATE INDEX "admin_audit_log_entity_type_entity_id_idx" ON "admin_audit_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "admin_audit_log_created_at_idx" ON "admin_audit_log"("created_at");

-- AddForeignKey
ALTER TABLE "source_documents" ADD CONSTRAINT "source_documents_current_version_id_fkey" FOREIGN KEY ("current_version_id") REFERENCES "source_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_versions" ADD CONSTRAINT "source_versions_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "source_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_age_group_id_fkey" FOREIGN KEY ("age_group_id") REFERENCES "age_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone_translations" ADD CONSTRAINT "milestone_translations_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone_translations" ADD CONSTRAINT "milestone_translations_source_version_id_fkey" FOREIGN KEY ("source_version_id") REFERENCES "source_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_translations" ADD CONSTRAINT "activity_translations_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_translations" ADD CONSTRAINT "activity_translations_source_version_id_fkey" FOREIGN KEY ("source_version_id") REFERENCES "source_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_links" ADD CONSTRAINT "activity_links_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_links" ADD CONSTRAINT "activity_links_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_video_mappings" ADD CONSTRAINT "activity_video_mappings_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_video_mappings" ADD CONSTRAINT "activity_video_mappings_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_video_mappings" ADD CONSTRAINT "activity_video_mappings_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_video_mappings" ADD CONSTRAINT "activity_video_mappings_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "source_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_video_mappings" ADD CONSTRAINT "activity_video_mappings_source_version_id_fkey" FOREIGN KEY ("source_version_id") REFERENCES "source_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_references" ADD CONSTRAINT "source_references_source_version_id_fkey" FOREIGN KEY ("source_version_id") REFERENCES "source_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_references" ADD CONSTRAINT "source_references_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_references" ADD CONSTRAINT "source_references_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_source_version_id_fkey" FOREIGN KEY ("source_version_id") REFERENCES "source_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "source_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_source_version_id_fkey" FOREIGN KEY ("source_version_id") REFERENCES "source_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_published_by_id_fkey" FOREIGN KEY ("published_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_issues" ADD CONSTRAINT "import_issues_import_job_id_fkey" FOREIGN KEY ("import_job_id") REFERENCES "import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_issues" ADD CONSTRAINT "import_issues_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "source_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_issues" ADD CONSTRAINT "import_issues_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_row_records" ADD CONSTRAINT "import_row_records_import_job_id_fkey" FOREIGN KEY ("import_job_id") REFERENCES "import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

