-- Migration 007: Fix profile creation RLS policies
-- This migration ensures users can create their own profiles and the auth trigger works properly

-- Drop existing INSERT policies
DROP POLICY IF EXISTS "Auth trigger can create profiles" ON profiles;
DROP POLICY IF EXISTS "Auth trigger can create settings" ON settings;

-- Create proper INSERT policies that allow users to create their own profiles
CREATE POLICY "Users can create own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can create own settings" ON settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Also add a policy to allow the auth trigger to work (for cases where the trigger runs)
CREATE POLICY "Auth trigger can create profiles" ON profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Auth trigger can create settings" ON settings
    FOR INSERT WITH CHECK (true);

-- Ensure the auth trigger function has proper permissions
GRANT USAGE ON SCHEMA public TO postgres;
GRANT ALL ON profiles TO postgres;
GRANT ALL ON settings TO postgres;
