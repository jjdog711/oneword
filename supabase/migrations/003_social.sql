-- OneWord App - Social Features
-- Migration 002: Friend requests, notifications, and social functionality

-- Create additional enums
DO $$ BEGIN
    CREATE TYPE request_status AS ENUM ('pending', 'accepted', 'declined', 'blocked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create friend_requests table
CREATE TABLE IF NOT EXISTS friend_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status request_status DEFAULT 'pending',
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (sender_id <> receiver_id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    data JSONB,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for social features
CREATE INDEX IF NOT EXISTS friend_requests_sender_idx ON friend_requests (sender_id);
CREATE INDEX IF NOT EXISTS friend_requests_receiver_idx ON friend_requests (receiver_id);
CREATE INDEX IF NOT EXISTS friend_requests_status_idx ON friend_requests (status);
CREATE INDEX IF NOT EXISTS friend_requests_canonical_idx ON friend_requests (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id));
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications (user_id, read_at);

-- Create function to notify friend requests
CREATE OR REPLACE FUNCTION notify_friend_request()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'pending' THEN
        INSERT INTO notifications (user_id, type, title, body, data)
        VALUES (
            NEW.receiver_id,
            'friend_request',
            'New Friend Request',
            'You have a new friend request',
            jsonb_build_object(
                'request_id', NEW.id,
                'sender_id', NEW.sender_id,
                'message', NEW.message
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to accept friend request
CREATE OR REPLACE FUNCTION accept_friend_request(request_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    request_record friend_requests%ROWTYPE;
BEGIN
    -- Get the friend request
    SELECT * INTO request_record 
    FROM friend_requests 
    WHERE id = request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Update request status
    UPDATE friend_requests 
    SET status = 'accepted', updated_at = NOW()
    WHERE id = request_id;
    
    -- Create connection between users
    INSERT INTO connections (user_a, user_b)
    VALUES (
        LEAST(request_record.sender_id, request_record.receiver_id),
        GREATEST(request_record.sender_id, request_record.receiver_id)
    )
    ON CONFLICT (LEAST(user_a, user_b), GREATEST(user_a, user_b)) DO NOTHING;
    
    -- Create notification for sender
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
        request_record.sender_id,
        'friend_request_accepted',
        'Friend Request Accepted',
        'Your friend request was accepted!',
        jsonb_build_object(
            'request_id', request_id,
            'receiver_id', request_record.receiver_id
        )
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Create function to decline friend request
CREATE OR REPLACE FUNCTION decline_friend_request(request_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    request_record friend_requests%ROWTYPE;
BEGIN
    -- Get the friend request
    SELECT * INTO request_record 
    FROM friend_requests 
    WHERE id = request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Update request status
    UPDATE friend_requests 
    SET status = 'declined', updated_at = NOW()
    WHERE id = request_id;
    
    -- Create notification for sender
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
        request_record.sender_id,
        'friend_request_declined',
        'Friend Request Declined',
        'Your friend request was declined',
        jsonb_build_object(
            'request_id', request_id,
            'receiver_id', request_record.receiver_id
        )
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Create function to block user
CREATE OR REPLACE FUNCTION block_user(blocker_id UUID, blocked_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if users are different
    IF blocker_id = blocked_id THEN
        RETURN false;
    END IF;
    
    -- Update any existing friend requests to blocked status
    UPDATE friend_requests 
    SET status = 'blocked', updated_at = NOW()
    WHERE (sender_id = blocker_id AND receiver_id = blocked_id)
       OR (sender_id = blocked_id AND receiver_id = blocker_id);
    
    -- Remove any existing connections
    DELETE FROM connections 
    WHERE (user_a = blocker_id AND user_b = blocked_id)
       OR (user_a = blocked_id AND user_b = blocker_id);
    
    -- Create notification for blocked user
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
        blocked_id,
        'user_blocked',
        'User Blocked You',
        'A user has blocked you',
        jsonb_build_object('blocker_id', blocker_id)
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Create function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notifications 
    SET read_at = NOW()
    WHERE id = notification_id AND user_id = auth.uid();
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE notifications 
    SET read_at = NOW()
    WHERE user_id = auth.uid() AND read_at IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for social features
DROP TRIGGER IF EXISTS on_friend_request_created ON friend_requests;
CREATE TRIGGER on_friend_request_created
    AFTER INSERT ON friend_requests
    FOR EACH ROW EXECUTE FUNCTION notify_friend_request();

DROP TRIGGER IF EXISTS set_friend_requests_updated_at ON friend_requests;
CREATE TRIGGER set_friend_requests_updated_at
    BEFORE UPDATE ON friend_requests
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Enable Row Level Security for social tables
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for friend requests
CREATE POLICY "Users can view their friend requests" ON friend_requests
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create friend requests" ON friend_requests
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their friend requests" ON friend_requests
    FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Create RLS policies for notifications
CREATE POLICY "Users can view their notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Grant permissions for social features
GRANT ALL ON friend_requests TO anon, authenticated;
GRANT ALL ON notifications TO anon, authenticated;
GRANT EXECUTE ON FUNCTION accept_friend_request(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION decline_friend_request(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION block_user(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read() TO anon, authenticated;
