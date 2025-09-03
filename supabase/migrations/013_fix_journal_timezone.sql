-- Fix timezone issues in journal functions to use user's timezone

-- Function to add a journal entry with proper timezone handling
CREATE OR REPLACE FUNCTION add_journal_entry(
    p_user_id UUID,
    p_date_local DATE,
    p_word TEXT,
    p_reflections TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user has already added a journal entry today (using user's timezone)
    IF EXISTS (
        SELECT 1 FROM journal_entries 
        WHERE user_id = p_user_id AND date_local = p_date_local
    ) THEN
        RAISE EXCEPTION 'Daily journal limit exceeded: You have already added a journal entry for today. Come back tomorrow to add another entry!';
    END IF;

    -- Insert the journal entry
    INSERT INTO journal_entries (user_id, date_local, word, reflections)
    VALUES (p_user_id, p_date_local, p_word, p_reflections);
END;
$$;

-- Function to get today's journal entry using user's timezone
CREATE OR REPLACE FUNCTION get_todays_journal_entry(p_user_id UUID, p_user_timezone TEXT DEFAULT 'America/New_York')
RETURNS TABLE (
    id UUID,
    user_id UUID,
    date_local DATE,
    word TEXT,
    reflections TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_today DATE;
BEGIN
    -- Get today's date in user's timezone
    user_today := (NOW() AT TIME ZONE p_user_timezone)::DATE;
    
    RETURN QUERY
    SELECT 
        je.id,
        je.user_id,
        je.date_local,
        je.word,
        je.reflections,
        je.created_at,
        je.updated_at
    FROM journal_entries je
    WHERE je.user_id = p_user_id 
    AND je.date_local = user_today;
END;
$$;
