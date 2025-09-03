-- Migration 017: Remove date_local requirement
-- Make date_local nullable since we're using created_at timestamps with timezone conversion

-- Make date_local nullable in words table
ALTER TABLE words ALTER COLUMN date_local DROP NOT NULL;

-- Make date_local nullable in journal_entries table  
ALTER TABLE journal_entries ALTER COLUMN date_local DROP NOT NULL;

-- Add comments to document the change
COMMENT ON COLUMN words.date_local IS 'Legacy field - use created_at with timezone conversion instead';
COMMENT ON COLUMN journal_entries.date_local IS 'Legacy field - use created_at with timezone conversion instead';
