-- Migration 016: Fix ambiguous column reference in has_user_sent_word_today function

-- Drop and recreate the function with proper column references
DROP FUNCTION IF EXISTS has_user_sent_word_today(UUID, UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION has_user_sent_word_today(user_uuid UUID, receiver_uuid UUID, is_public_param BOOLEAN DEFAULT false)
RETURNS BOOLEAN AS $$
DECLARE
  word_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM words w
    WHERE w.sender_id = user_uuid
    AND w.receiver_id = receiver_uuid
    AND w.is_public = is_public_param
    AND DATE(w.created_at AT TIME ZONE 'America/New_York') = get_today_in_target_timezone()
  ) INTO word_exists;
  
  RETURN word_exists;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION has_user_sent_word_today(UUID, UUID, BOOLEAN) IS 'Checks if user has sent a word today in America/New_York timezone with proper column references';
