-- Migration 005: Direct Messaging System
-- This migration adds the necessary tables and functions for DMs

-- Create message types enum
DO $$ BEGIN
    CREATE TYPE message_type AS ENUM ('text', 'image', 'file', 'voice', 'reaction');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create message status enum
DO $$ BEGIN
    CREATE TYPE message_status_enum AS ENUM ('sent', 'delivered', 'read');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create conversations table (DM threads between users)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    user_b UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    last_message_id UUID,
    last_message_at TIMESTAMPTZ,
    is_archived_a BOOLEAN DEFAULT false,
    is_archived_b BOOLEAN DEFAULT false,
    is_pinned_a BOOLEAN DEFAULT false,
    is_pinned_b BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (user_a <> user_b)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message_type message_type DEFAULT 'text',
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create message status table for read receipts
CREATE TABLE IF NOT EXISTS message_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status message_status_enum DEFAULT 'sent',
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (message_id, user_id)
);

-- Create message reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reaction TEXT NOT NULL, -- emoji or reaction type
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (message_id, user_id, reaction)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS conversations_user_a_idx ON conversations (user_a);
CREATE INDEX IF NOT EXISTS conversations_user_b_idx ON conversations (user_b);
CREATE INDEX IF NOT EXISTS conversations_last_message_at_idx ON conversations (last_message_at DESC);
CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON messages (sender_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages (created_at DESC);
CREATE INDEX IF NOT EXISTS messages_reply_to_id_idx ON messages (reply_to_id);
CREATE INDEX IF NOT EXISTS message_status_message_id_idx ON message_status (message_id);
CREATE INDEX IF NOT EXISTS message_status_user_id_idx ON message_status (user_id);
CREATE INDEX IF NOT EXISTS message_reactions_message_id_idx ON message_reactions (message_id);
CREATE INDEX IF NOT EXISTS message_reactions_user_id_idx ON message_reactions (user_id);

-- Create function to update conversation last message
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET 
        last_message_id = NEW.id,
        last_message_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update conversation on new message
DROP TRIGGER IF EXISTS on_message_insert ON messages;
CREATE TRIGGER on_message_insert
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- Create function to get or create conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
    conversation_id UUID;
    smaller_id UUID;
    larger_id UUID;
BEGIN
    -- Determine which ID is smaller and larger
    IF user1_id < user2_id THEN
        smaller_id := user1_id;
        larger_id := user2_id;
    ELSE
        smaller_id := user2_id;
        larger_id := user1_id;
    END IF;
    
    -- Try to find existing conversation
    SELECT id INTO conversation_id
    FROM conversations
    WHERE user_a = smaller_id AND user_b = larger_id;
    
    -- If not found, create new conversation
    IF conversation_id IS NULL THEN
        INSERT INTO conversations (user_a, user_b)
        VALUES (smaller_id, larger_id)
        RETURNING id INTO conversation_id;
    END IF;
    
    RETURN conversation_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(conversation_id UUID, user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Update message status for unread messages in conversation
    UPDATE message_status
    SET status = 'read', read_at = NOW()
    WHERE message_id IN (
        SELECT id FROM messages 
        WHERE conversation_id = $1 
        AND sender_id != $2
    )
    AND user_id = $2
    AND status != 'read';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for conversations
CREATE POLICY "Users can view their conversations" ON conversations
    FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Users can update their conversations" ON conversations
    FOR UPDATE USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Create RLS policies for messages
CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE user_a = auth.uid() OR user_b = auth.uid()
        )
    );

CREATE POLICY "Users can create messages in their conversations" ON messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE user_a = auth.uid() OR user_b = auth.uid()
        )
    );

CREATE POLICY "Users can update their own messages" ON messages
    FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "Users can delete their own messages" ON messages
    FOR DELETE USING (sender_id = auth.uid());

-- Create RLS policies for message_status
CREATE POLICY "Users can view message status in their conversations" ON message_status
    FOR SELECT USING (
        message_id IN (
            SELECT m.id FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE c.user_a = auth.uid() OR c.user_b = auth.uid()
        )
    );

CREATE POLICY "Users can update message status" ON message_status
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert message status" ON message_status
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create RLS policies for message_reactions
CREATE POLICY "Users can view reactions in their conversations" ON message_reactions
    FOR SELECT USING (
        message_id IN (
            SELECT m.id FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE c.user_a = auth.uid() OR c.user_b = auth.uid()
        )
    );

CREATE POLICY "Users can create reactions" ON message_reactions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own reactions" ON message_reactions
    FOR DELETE USING (user_id = auth.uid());

-- Grant permissions
GRANT ALL ON conversations TO authenticated;
GRANT ALL ON messages TO authenticated;
GRANT ALL ON message_status TO authenticated;
GRANT ALL ON message_reactions TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
