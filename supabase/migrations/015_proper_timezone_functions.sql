-- Migration 015: Proper timezone functions
-- Create database functions for consistent timezone handling

-- Function to get today's date in target timezone
CREATE OR REPLACE FUNCTION get_today_in_target_timezone()
RETURNS DATE AS $$
BEGIN
  RETURN DATE(NOW() AT TIME ZONE 'America/New_York');
END;
$$ LANGUAGE plpgsql;

-- Function to check if a timestamp is from today in target timezone
CREATE OR REPLACE FUNCTION is_timestamp_today_in_target_timezone(timestamp_value TIMESTAMPTZ)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN DATE(timestamp_value AT TIME ZONE 'America/New_York') = get_today_in_target_timezone();
END;
$$ LANGUAGE plpgsql;

-- Function to get public words for today in target timezone
CREATE OR REPLACE FUNCTION get_public_words_today()
RETURNS TABLE (
  id UUID,
  text TEXT,
  sender_id UUID,
  created_at TIMESTAMPTZ,
  date_local DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.text,
    w.sender_id,
    w.created_at,
    DATE(w.created_at AT TIME ZONE 'America/New_York') as date_local
  FROM words w
  WHERE w.is_public = true
  AND DATE(w.created_at AT TIME ZONE 'America/New_York') = get_today_in_target_timezone()
  ORDER BY w.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's public word for today in target timezone
CREATE OR REPLACE FUNCTION get_user_public_word_today(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  text TEXT,
  sender_id UUID,
  created_at TIMESTAMPTZ,
  date_local DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.text,
    w.sender_id,
    w.created_at,
    DATE(w.created_at AT TIME ZONE 'America/New_York') as date_local
  FROM words w
  WHERE w.sender_id = user_uuid
  AND w.is_public = true
  AND DATE(w.created_at AT TIME ZONE 'America/New_York') = get_today_in_target_timezone()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has already sent a word today in target timezone
CREATE OR REPLACE FUNCTION has_user_sent_word_today(user_uuid UUID, receiver_uuid UUID, is_public BOOLEAN DEFAULT false)
RETURNS BOOLEAN AS $$
DECLARE
  word_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM words w
    WHERE w.sender_id = user_uuid
    AND w.receiver_id = receiver_uuid
    AND w.is_public = is_public
    AND DATE(w.created_at AT TIME ZONE 'America/New_York') = get_today_in_target_timezone()
  ) INTO word_exists;
  
  RETURN word_exists;
END;
$$ LANGUAGE plpgsql;

-- Function to get friends' public words for today in target timezone
CREATE OR REPLACE FUNCTION get_friends_public_words_today(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  text TEXT,
  sender_id UUID,
  created_at TIMESTAMPTZ,
  date_local DATE,
  friend_name TEXT,
  friend_username TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.text,
    w.sender_id,
    w.created_at,
    DATE(w.created_at AT TIME ZONE 'America/New_York') as date_local,
    p.name as friend_name,
    p.username as friend_username
  FROM words w
  JOIN profiles p ON w.sender_id = p.id
  WHERE w.is_public = true
  AND w.sender_id IN (
    SELECT friend_id FROM get_user_friends(user_uuid)
  )
  AND DATE(w.created_at AT TIME ZONE 'America/New_York') = get_today_in_target_timezone()
  ORDER BY w.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON FUNCTION get_today_in_target_timezone() IS 'Returns today''s date in America/New_York timezone';
COMMENT ON FUNCTION is_timestamp_today_in_target_timezone(TIMESTAMPTZ) IS 'Checks if a timestamp is from today in America/New_York timezone';
COMMENT ON FUNCTION get_public_words_today() IS 'Gets all public words from today in America/New_York timezone';
COMMENT ON FUNCTION get_user_public_word_today(UUID) IS 'Gets a user''s public word from today in America/New_York timezone';
COMMENT ON FUNCTION has_user_sent_word_today(UUID, UUID, BOOLEAN) IS 'Checks if user has sent a word today in America/New_York timezone';
COMMENT ON FUNCTION get_friends_public_words_today(UUID) IS 'Gets friends'' public words from today in America/New_York timezone';
