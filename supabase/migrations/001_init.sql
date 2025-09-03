-- OneWord App - Initial Database Schema
-- Migration 001: Core tables, enums, indexes, functions, and triggers

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enums
DO $$ BEGIN
    CREATE TYPE reveal_type AS ENUM ('instant', 'mutual', 'scheduled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create profiles table (references auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_premium BOOLEAN DEFAULT false,
    tz_name TEXT DEFAULT 'America/New_York',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create connections table (friend relationships)
CREATE TABLE IF NOT EXISTS connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    user_b UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (user_a <> user_b)
);

-- Create words table (daily one-word messages)
CREATE TABLE IF NOT EXISTS words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date_local DATE NOT NULL,
    text TEXT NOT NULL CHECK (length(text) > 0 AND length(text) <= 64),
    reveal reveal_type DEFAULT 'instant',
    reveal_time TIMESTAMPTZ,
    is_public BOOLEAN DEFAULT false,
    burn_if_unread BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (sender_id, receiver_id, date_local)
);

-- Create journal_entries table (personal daily reflections)
CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date_local DATE NOT NULL,
    my_word TEXT,
    reflections TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, date_local)
);

-- Create settings table (user preferences)
CREATE TABLE IF NOT EXISTS settings (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    notif_enabled BOOLEAN DEFAULT true,
    reminder_time TIME DEFAULT '20:00',
    public_opt_in BOOLEAN DEFAULT false,
    theme TEXT DEFAULT 'default',
    gamification_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create public_words view
CREATE OR REPLACE VIEW public_words AS
SELECT * FROM words WHERE is_public = true;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS words_receiver_date_idx ON words (receiver_id, date_local);
CREATE INDEX IF NOT EXISTS words_sender_date_idx ON words (sender_id, date_local);
CREATE INDEX IF NOT EXISTS connections_user_a_idx ON connections (user_a);
CREATE INDEX IF NOT EXISTS connections_user_b_idx ON connections (user_b);
CREATE INDEX IF NOT EXISTS connections_canonical_idx ON connections (LEAST(user_a, user_b), GREATEST(user_a, user_b));
CREATE INDEX IF NOT EXISTS journal_entries_user_date_idx ON journal_entries (user_id, date_local);

-- Create reusable function to update updated_at timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create RLS function for mutual reveal logic
CREATE OR REPLACE FUNCTION can_read_word(viewer_id UUID, word_row words)
RETURNS BOOLEAN AS $$
BEGIN
    -- User can always read their own words
    IF viewer_id = word_row.sender_id THEN
        RETURN true;
    END IF;
    
    -- User can always read words sent to them
    IF viewer_id = word_row.receiver_id THEN
        -- For instant reveals, always allow
        IF word_row.reveal = 'instant' THEN
            RETURN true;
        END IF;
        
        -- For scheduled reveals, check if time has passed
        IF word_row.reveal = 'scheduled' AND word_row.reveal_time IS NOT NULL THEN
            RETURN NOW() >= word_row.reveal_time;
        END IF;
        
        -- For mutual reveals, check if both users have sent words
        IF word_row.reveal = 'mutual' THEN
            RETURN EXISTS (
                SELECT 1 FROM words w2 
                WHERE w2.sender_id = word_row.receiver_id 
                AND w2.receiver_id = word_row.sender_id 
                AND w2.date_local = word_row.date_local
            );
        END IF;
    END IF;
    
    -- Public words can be read by anyone
    IF word_row.is_public THEN
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert profile with error handling
    BEGIN
        INSERT INTO profiles (id, name, created_at, updated_at)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'name', 'Anonymous'),
            NOW(),
            NOW()
        );
    EXCEPTION
        WHEN OTHERS THEN
            -- Log the error but don't fail the auth process
            RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    END;
    
    -- Insert settings with error handling
    BEGIN
        INSERT INTO settings (user_id, created_at, updated_at)
        VALUES (NEW.id, NOW(), NOW());
    EXCEPTION
        WHEN OTHERS THEN
            -- Log the error but don't fail the auth process
            RAISE WARNING 'Failed to create settings for user %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

DROP TRIGGER IF EXISTS set_profiles_updated_at ON profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_settings_updated_at ON settings;
CREATE TRIGGER set_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE words ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Profiles: Users can read/update their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Allow auth trigger to create new profiles
CREATE POLICY "Auth trigger can create profiles" ON profiles
    FOR INSERT WITH CHECK (true);

-- Allow auth trigger to create new settings
CREATE POLICY "Auth trigger can create settings" ON settings
    FOR INSERT WITH CHECK (true);

-- Connections: Users can view connections they're part of
CREATE POLICY "Users can view their connections" ON connections
    FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Users can create connections" ON connections
    FOR INSERT WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

-- Words: Users can read words they can access based on reveal logic
CREATE POLICY "Users can read accessible words" ON words
    FOR SELECT USING (can_read_word(auth.uid(), words.*));

CREATE POLICY "Users can create words" ON words
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update own words" ON words
    FOR UPDATE USING (auth.uid() = sender_id);

-- Journal entries: Users can only access their own entries
CREATE POLICY "Users can view own journal entries" ON journal_entries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own journal entries" ON journal_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal entries" ON journal_entries
    FOR UPDATE USING (auth.uid() = user_id);

-- Settings: Users can only access their own settings
CREATE POLICY "Users can view own settings" ON settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON settings
    FOR UPDATE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
