-- Migration 002: Disable email confirmation for no-verification signup
-- This migration configures Supabase auth to auto-confirm users

-- Note: For local development, email confirmation is typically disabled by default
-- This migration is mainly for documentation purposes

-- If you need to disable email confirmation in production:
-- 1. Go to Supabase Dashboard → Authentication → Settings → Auth Providers → Email
-- 2. Disable "Confirm email" option
-- 3. Save the changes

-- For local development, this should work out of the box
-- No additional SQL needed for local setup
