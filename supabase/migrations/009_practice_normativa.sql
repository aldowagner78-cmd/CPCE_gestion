-- Migration 009: Add normativa field to practices table
-- Allows per-practice normative notes (INCLUYE/EXCLUYE/REQUISITOS)
-- Inspired by IAPOS Buscador concept

-- Add normativa text field
ALTER TABLE practices ADD COLUMN IF NOT EXISTS normativa TEXT;

-- Add coseguro field (for display purposes)
ALTER TABLE practices ADD COLUMN IF NOT EXISTS coseguro VARCHAR(100);

-- Index for full-text search on normativa
CREATE INDEX IF NOT EXISTS idx_practices_normativa_search 
ON practices USING GIN (to_tsvector('spanish', COALESCE(normativa, '')));

-- Comment
COMMENT ON COLUMN practices.normativa IS 'Texto normativo: qué incluye, excluye, requisitos. Editable por auditores.';
COMMENT ON COLUMN practices.coseguro IS 'Texto de coseguro aplicable a la práctica.';
