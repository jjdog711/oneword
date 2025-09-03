-- Migration: Add timezone field to profiles table
-- This migration adds user timezone support for deterministic daily logic

-- Add timezone column to profiles table
-- Default to 'America/New_York' for backward compatibility
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';

-- Update existing users to have proper timezone
-- This ensures all existing users have a valid timezone value
UPDATE profiles SET timezone = 'America/New_York' WHERE timezone IS NULL;

-- Create index on timezone for performance
CREATE INDEX IF NOT EXISTS profiles_timezone_idx ON profiles (timezone);

-- Add constraint to ensure timezone is not null
ALTER TABLE profiles ALTER COLUMN timezone SET NOT NULL;

-- Add check constraint to ensure valid IANA timezone format
-- This is a basic validation - more comprehensive validation should be done in application code
ALTER TABLE profiles ADD CONSTRAINT profiles_timezone_format_check 
  CHECK (timezone ~ '^[A-Za-z_]+/[A-Za-z_]+$' OR timezone = 'UTC');

-- Update the handle_new_user function to set default timezone
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, name, username, timezone, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        'America/New_York', -- Default timezone for new users
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, UPDATE ON profiles TO authenticated;

-- Add comment for documentation
COMMENT ON COLUMN profiles.timezone IS 'IANA timezone identifier for user (e.g., America/New_York, Europe/London)';
COMMENT ON TABLE profiles IS 'User profiles with timezone support for deterministic daily logic';
