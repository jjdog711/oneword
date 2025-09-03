-- Migration 008: Facebook-style social system
-- Clean, simple approach like Facebook

-- Drop existing complex tables
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS friend_requests CASCADE;

-- Create simple friendships table (like Facebook)
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

-- Create simple messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_friendships_requester ON friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX idx_friendships_status ON friendships(status);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);

-- RLS policies for friendships
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friendships" ON friendships
  FOR SELECT USING (
    auth.uid() = requester_id OR auth.uid() = addressee_id
  );

CREATE POLICY "Users can create friend requests" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update their own friendships" ON friendships
  FOR UPDATE USING (auth.uid() = addressee_id);

-- RLS policies for messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages they sent or received" ON messages
  FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  );

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Function to get user's friends
CREATE OR REPLACE FUNCTION get_user_friends(user_id UUID)
RETURNS TABLE (
  friend_id UUID,
  friend_name TEXT,
  friend_username TEXT,
  friendship_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN f.requester_id = user_id THEN f.addressee_id
      ELSE f.requester_id
    END as friend_id,
    p.name as friend_name,
    p.username as friend_username,
    f.id as friendship_id
  FROM friendships f
  JOIN profiles p ON (
    CASE 
      WHEN f.requester_id = user_id THEN f.addressee_id
      ELSE f.requester_id
    END = p.id
  )
  WHERE (f.requester_id = user_id OR f.addressee_id = user_id)
    AND f.status = 'accepted';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending friend requests
CREATE OR REPLACE FUNCTION get_pending_requests(user_id UUID)
RETURNS TABLE (
  requester_id UUID,
  requester_name TEXT,
  requester_username TEXT,
  friendship_id UUID,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.requester_id,
    p.name as requester_name,
    p.username as requester_username,
    f.id as friendship_id,
    f.created_at
  FROM friendships f
  JOIN profiles p ON f.requester_id = p.id
  WHERE f.addressee_id = user_id AND f.status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
