-- Setup script to disable email confirmation for OneWord app
-- Run this in your Supabase SQL editor or via CLI

-- Method 1: Update auth configuration
UPDATE auth.config 
SET 
  email_confirm = false,
  enable_confirmations = false,
  enable_email_change_confirmations = false
WHERE id = 1;

-- Method 2: Set configuration via SQL (alternative approach)
SELECT set_config('auth.email_confirm', 'false', false);
SELECT set_config('auth.enable_confirmations', 'false', false);

-- Method 3: If using Supabase Dashboard, go to:
-- Authentication > Settings > Auth Providers > Email
-- And disable "Confirm email" option

-- Verify the changes
SELECT 
  email_confirm,
  enable_confirmations,
  enable_email_change_confirmations
FROM auth.config 
WHERE id = 1;
