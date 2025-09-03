-- Fix journal_entries table by dropping and recreating it properly
DROP TABLE IF EXISTS journal_entries CASCADE;

-- Create journal_entries table for private daily journal entries
CREATE TABLE journal_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date_local DATE NOT NULL,
    word TEXT NOT NULL,
    reflections TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one entry per user per day
    UNIQUE(user_id, date_local)
);

-- Add indexes for performance
CREATE INDEX idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX idx_journal_entries_date_local ON journal_entries(date_local);
CREATE INDEX idx_journal_entries_user_date ON journal_entries(user_id, date_local);

-- Add RLS policies
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Users can only see their own journal entries
CREATE POLICY "Users can view own journal entries" ON journal_entries
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own journal entries
CREATE POLICY "Users can insert own journal entries" ON journal_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own journal entries
CREATE POLICY "Users can update own journal entries" ON journal_entries
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own journal entries
CREATE POLICY "Users can delete own journal entries" ON journal_entries
    FOR DELETE USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_journal_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_journal_entries_updated_at
    BEFORE UPDATE ON journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_journal_entries_updated_at();
