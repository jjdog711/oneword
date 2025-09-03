-- Fix timezone data migration
-- This migration updates existing date_local values to use Eastern Time instead of UTC

-- First, let's see what data we have
SELECT 
    id,
    text,
    date_local,
    created_at,
    sender_id
FROM words 
WHERE is_public = true 
ORDER BY created_at DESC 
LIMIT 10;

-- Update date_local values to use Eastern Time
-- We need to convert the created_at timestamp to Eastern Time and extract the date
UPDATE words 
SET date_local = (
    SELECT DATE(
        (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/New_York')::timestamp
    )
)
WHERE is_public = true;

-- Also update the public_words view if it exists
-- (This might be a view that references the words table)

-- Verify the changes
SELECT 
    id,
    text,
    date_local,
    created_at,
    sender_id
FROM words 
WHERE is_public = true 
ORDER BY created_at DESC 
LIMIT 10;
