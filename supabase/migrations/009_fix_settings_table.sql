-- Migration 009: Fix settings table
-- Add missing columns for friend request notifications

-- Add friend_request_notifications column to settings table
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS friend_request_notifications BOOLEAN DEFAULT true;

-- Add other missing notification settings
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS message_notifications BOOLEAN DEFAULT true;

ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS word_notifications BOOLEAN DEFAULT true;

-- Update existing settings to have default values
UPDATE settings 
SET 
  friend_request_notifications = COALESCE(friend_request_notifications, true),
  message_notifications = COALESCE(message_notifications, true),
  word_notifications = COALESCE(word_notifications, true)
WHERE friend_request_notifications IS NULL 
   OR message_notifications IS NULL 
   OR word_notifications IS NULL;
