-- Migration 006: Fix auth trigger to follow Supabase best practices
-- This migration fixes the handle_new_user function to work properly with RLS

-- Drop and recreate the function with SECURITY DEFINER and proper error handling
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

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions to the function
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO anon;
