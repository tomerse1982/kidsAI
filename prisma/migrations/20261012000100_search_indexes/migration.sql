-- Search & integrity structures that the Prisma schema language cannot express.
-- Keep in sync with src/server/search/*. Safe to re-run (IF NOT EXISTS).

-- Approximate nearest-neighbour index for multilingual embeddings (cosine distance).
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_hnsw
  ON knowledge_chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Full-text search. PostgreSQL has no Hebrew/Arabic stemmers, so the 'simple'
-- configuration (lower-casing + tokenisation) is used; normalisation of Arabic
-- diacritics happens in application code before indexing/querying.
CREATE INDEX IF NOT EXISTS knowledge_chunks_fts
  ON knowledge_chunks USING gin (to_tsvector('simple', text_content));

-- Fuzzy title matching (typos, partial phrases) for milestones and activities.
CREATE INDEX IF NOT EXISTS milestone_translations_title_trgm
  ON milestone_translations USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS activity_translations_title_trgm
  ON activity_translations USING gin (title gin_trgm_ops);

-- Codes must look like canonical identifiers (guards against float artefacts like "4.1" for "4.10"
-- being written through another path without validation).
ALTER TABLE milestones
  ADD CONSTRAINT milestones_code_format CHECK (milestone_code ~ '^[0-9]{1,2}\.[0-9]{1,2}$');
ALTER TABLE activities
  ADD CONSTRAINT activities_code_format CHECK (activity_code ~ '^[0-9]{1,2}\.[0-9]{1,2}(\.[0-9]{1,3}|-E[0-9]{1,3}(-(he|ar))?)$');

-- A video mapping's activity must belong to the mapping's milestone.
CREATE OR REPLACE FUNCTION check_mapping_activity_milestone() RETURNS trigger AS $$
BEGIN
  IF NEW.activity_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM activities a WHERE a.id = NEW.activity_id AND a.milestone_id = NEW.milestone_id
  ) THEN
    RAISE EXCEPTION 'activity % does not belong to milestone %', NEW.activity_id, NEW.milestone_id;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mapping_activity_milestone ON activity_video_mappings;
CREATE TRIGGER mapping_activity_milestone
  BEFORE INSERT OR UPDATE ON activity_video_mappings
  FOR EACH ROW EXECUTE FUNCTION check_mapping_activity_milestone();

-- YouTube ids are exactly 11 url-safe characters.
ALTER TABLE videos
  ADD CONSTRAINT videos_youtube_id_format CHECK (provider <> 'youtube' OR provider_video_id ~ '^[A-Za-z0-9_-]{11}$');
