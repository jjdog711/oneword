-- Migration 003: Enhance profiles table for MVP
-- Add username, privacy settings, and basic stats

-- Add new columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private')),
ADD COLUMN IF NOT EXISTS allow_friend_requests BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS words_sent_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS words_received_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ DEFAULT NOW();

-- Create index on username for fast lookups
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles (username);

-- Create index on profile visibility for privacy filtering
CREATE INDEX IF NOT EXISTS profiles_visibility_idx ON profiles (profile_visibility);

-- Update the handle_new_user function to set a default username
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, name, username, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update user stats when words are sent/received
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update sender stats
    UPDATE profiles 
    SET 
        words_sent_count = words_sent_count + 1,
        updated_at = NOW()
    WHERE id = NEW.sender_id;
    
    -- Update receiver stats (only if not self-send)
    IF NEW.sender_id != NEW.receiver_id THEN
        UPDATE profiles 
        SET 
            words_received_count = words_received_count + 1,
            updated_at = NOW()
        WHERE id = NEW.receiver_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update stats when words are inserted
CREATE TRIGGER update_user_stats_on_word_insert
    AFTER INSERT ON words
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats();

-- Create function to update last_active timestamp
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_active = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update last_active on profile updates
CREATE TRIGGER update_last_active_on_profile_update
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_last_active();

-- Update RLS policies to respect profile visibility
DROP POLICY IF EXISTS profiles_select_policy ON profiles;
CREATE POLICY profiles_select_policy ON profiles
    FOR SELECT USING (
        -- Users can always see their own profile
        auth.uid() = id OR
        -- Public profiles are visible to everyone
        profile_visibility = 'public' OR
        -- Private profiles are only visible to connected friends
        (profile_visibility = 'private' AND EXISTS (
            SELECT 1 FROM connections 
            WHERE (user_a = auth.uid() AND user_b = id) OR (user_a = id AND user_b = auth.uid())
        ))
    );

-- Update friend request policies to respect allow_friend_requests setting
DROP POLICY IF EXISTS friend_requests_insert_policy ON friend_requests;
CREATE POLICY friend_requests_insert_policy ON friend_requests
    FOR INSERT WITH CHECK (
        -- Sender must be authenticated
        auth.uid() = sender_id AND
        -- Receiver must allow friend requests
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = receiver_id AND allow_friend_requests = true
        )
    );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON profiles TO anon, authenticated;
GRANT ALL ON friend_requests TO anon, authenticated;
GRANT ALL ON connections TO anon, authenticated;
GRANT ALL ON words TO anon, authenticated;
GRANT ALL ON journal_entries TO anon, authenticated;
GRANT ALL ON settings TO anon, authenticated;
GRANT ALL ON notifications TO anon, authenticated;

-- Create function to get user profile with privacy filtering
CREATE OR REPLACE FUNCTION get_user_profile(target_user_id UUID)
RETURNS TABLE (
    id UUID,
    username TEXT,
    name TEXT,
    profile_visibility TEXT,
    words_sent_count INTEGER,
    words_received_count INTEGER,
    streak_days INTEGER,
    last_active TIMESTAMPTZ,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.username,
        p.name,
        p.profile_visibility,
        p.words_sent_count,
        p.words_received_count,
        p.streak_days,
        p.last_active,
        p.created_at
    FROM profiles p
    WHERE p.id = target_user_id
    AND (
        -- Users can always see their own profile
        auth.uid() = target_user_id OR
        -- Public profiles are visible to everyone
        p.profile_visibility = 'public' OR
        -- Private profiles are only visible to connected friends
        (p.profile_visibility = 'private' AND EXISTS (
            SELECT 1 FROM connections 
            WHERE (user_a = auth.uid() AND user_b = target_user_id) OR (user_a = target_user_id AND user_b = auth.uid())
        ))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to search users (respecting privacy settings)
CREATE OR REPLACE FUNCTION search_users(search_term TEXT, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    username TEXT,
    name TEXT,
    profile_visibility TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.username,
        p.name,
        p.profile_visibility
    FROM profiles p
    WHERE (
        -- Search in username or name
        p.username ILIKE '%' || search_term || '%' OR
        p.name ILIKE '%' || search_term || '%'
    )
    AND (
        -- Only show public profiles or connected friends
        p.profile_visibility = 'public' OR
        (p.profile_visibility = 'private' AND EXISTS (
            SELECT 1 FROM connections 
            WHERE (user_a = auth.uid() AND user_b = p.id) OR (user_a = p.id AND user_b = auth.uid())
        ))
    )
    AND p.id != auth.uid() -- Don't show current user
    ORDER BY 
        CASE WHEN p.username ILIKE search_term || '%' THEN 1
             WHEN p.name ILIKE search_term || '%' THEN 2
             ELSE 3
        END,
        p.name
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
