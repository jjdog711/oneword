-- OneWord App - Seed Data
-- This file will be automatically run by Supabase CLI

-- Get the user IDs from auth.users
DO $$
DECLARE
    jjdog_id UUID;
    skye_id UUID;
    sadie_id UUID;
BEGIN
    -- Get user IDs from auth.users
    SELECT id INTO jjdog_id FROM auth.users WHERE email = 'jjdog@example.com';
    SELECT id INTO skye_id FROM auth.users WHERE email = 'skye@example.com';
    SELECT id INTO sadie_id FROM auth.users WHERE email = 'sadie@example.com';
    
    -- Create profiles for these users
    INSERT INTO profiles (id, name, username, created_at, updated_at)
    VALUES 
        (jjdog_id, 'jjdog', 'jjdog', NOW(), NOW()),
        (skye_id, 'skye', 'skye', NOW(), NOW()),
        (sadie_id, 'sadie', 'sadie', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        username = EXCLUDED.username,
        updated_at = NOW();
    
    -- Create friendships between all users
    INSERT INTO friendships (requester_id, addressee_id, status, created_at, updated_at)
    VALUES 
        (jjdog_id, skye_id, 'accepted', NOW() - INTERVAL '10 days', NOW()),
        (jjdog_id, sadie_id, 'accepted', NOW() - INTERVAL '8 days', NOW()),
        (skye_id, sadie_id, 'accepted', NOW() - INTERVAL '6 days', NOW())
    ON CONFLICT (requester_id, addressee_id) DO NOTHING;
    
    -- Create direct messages
    INSERT INTO messages (sender_id, receiver_id, content, created_at)
    VALUES 
        -- jjdog ↔ skye
        (jjdog_id, skye_id, 'reach', '2025-08-15 20:15:00+00'),
        (skye_id, jjdog_id, 'quiet', '2025-08-15 21:30:00+00'),
        (skye_id, jjdog_id, 'pull', '2025-08-16 19:45:00+00'),
        (jjdog_id, skye_id, 'burn', '2025-08-17 20:20:00+00'),
        (jjdog_id, skye_id, 'grip', '2025-08-19 18:30:00+00'),
        (skye_id, jjdog_id, 'let go', '2025-08-19 22:15:00+00'),
        (jjdog_id, skye_id, 'flow', '2025-08-20 20:00:00+00'),
        (skye_id, jjdog_id, 'pause', '2025-08-20 21:45:00+00'),
        (jjdog_id, skye_id, 'rise', '2025-08-21 19:30:00+00'),
        (jjdog_id, skye_id, 'stillness', '2025-08-22 20:45:00+00'),
        (skye_id, jjdog_id, 'echo', '2025-08-22 21:20:00+00'),
        (jjdog_id, skye_id, 'anchor', '2025-08-24 18:15:00+00'),
        (skye_id, jjdog_id, 'hope', '2025-08-24 20:30:00+00'),

        -- jjdog ↔ sadie
        (jjdog_id, sadie_id, 'grit', '2025-08-15 19:20:00+00'),
        (sadie_id, jjdog_id, 'slow', '2025-08-15 21:00:00+00'),
        (jjdog_id, sadie_id, 'ache', '2025-08-16 20:30:00+00'),
        (sadie_id, jjdog_id, 'heal', '2025-08-16 22:15:00+00'),
        (sadie_id, jjdog_id, 'echo', '2025-08-17 19:45:00+00'),
        (jjdog_id, sadie_id, 'wake', '2025-08-19 20:00:00+00'),
        (sadie_id, jjdog_id, 'drift', '2025-08-19 21:30:00+00'),
        (jjdog_id, sadie_id, 'breathe', '2025-08-20 18:45:00+00'),
        (jjdog_id, sadie_id, 'shine', '2025-08-21 20:15:00+00'),
        (sadie_id, jjdog_id, 'glow', '2025-08-21 21:00:00+00'),
        (sadie_id, jjdog_id, 'stillness', '2025-08-22 19:30:00+00'),
        (jjdog_id, sadie_id, 'peace', '2025-08-23 20:45:00+00'),
        (sadie_id, jjdog_id, 'calm', '2025-08-23 21:15:00+00'),

        -- skye ↔ sadie
        (skye_id, sadie_id, 'gentle', '2025-08-15 20:45:00+00'),
        (sadie_id, skye_id, 'kind', '2025-08-15 21:30:00+00'),
        (skye_id, sadie_id, 'soft', '2025-08-16 19:15:00+00'),
        (skye_id, sadie_id, 'warm', '2025-08-17 20:30:00+00'),
        (sadie_id, skye_id, 'cozy', '2025-08-17 21:45:00+00'),
        (sadie_id, skye_id, 'dream', '2025-08-19 18:30:00+00'),
        (skye_id, sadie_id, 'light', '2025-08-20 20:00:00+00'),
        (sadie_id, skye_id, 'bright', '2025-08-20 21:30:00+00'),
        (skye_id, sadie_id, 'spark', '2025-08-21 19:45:00+00'),
        (skye_id, sadie_id, 'glow', '2025-08-22 20:15:00+00'),
        (sadie_id, skye_id, 'shine', '2025-08-22 21:00:00+00'),
        (skye_id, sadie_id, 'hope', '2025-08-24 18:45:00+00'),
        (sadie_id, skye_id, 'faith', '2025-08-24 20:15:00+00');
    
    -- Create public words
    INSERT INTO words (sender_id, receiver_id, date_local, text, is_public, created_at)
    VALUES 
        -- 08-15-25
        (jjdog_id, jjdog_id, '2025-08-15', 'grit', true, '2025-08-15 20:00:00+00'),
        (skye_id, skye_id, '2025-08-15', 'slow', true, '2025-08-15 21:30:00+00'),
        (sadie_id, sadie_id, '2025-08-15', 'gentle', true, '2025-08-15 22:00:00+00'),
        
        -- 08-16-25 (sadie misses)
        (jjdog_id, jjdog_id, '2025-08-16', 'ache', true, '2025-08-16 19:45:00+00'),
        (skye_id, skye_id, '2025-08-16', 'pull', true, '2025-08-16 20:30:00+00'),
        
        -- 08-17-25
        (jjdog_id, jjdog_id, '2025-08-17', 'still', true, '2025-08-17 20:15:00+00'),
        (skye_id, skye_id, '2025-08-17', 'echo', true, '2025-08-17 21:00:00+00'),
        (sadie_id, sadie_id, '2025-08-17', 'warm', true, '2025-08-17 21:45:00+00'),
        
        -- 08-18-25 (everyone misses - no public words)
        
        -- 08-19-25
        (jjdog_id, jjdog_id, '2025-08-19', 'wake', true, '2025-08-19 18:30:00+00'),
        (skye_id, skye_id, '2025-08-19', 'drift', true, '2025-08-19 20:15:00+00'),
        (sadie_id, sadie_id, '2025-08-19', 'dream', true, '2025-08-19 21:00:00+00'),
        
        -- 08-20-25 (jjdog misses)
        (skye_id, skye_id, '2025-08-20', 'light', true, '2025-08-20 19:30:00+00'),
        (sadie_id, sadie_id, '2025-08-20', 'bright', true, '2025-08-20 20:45:00+00'),
        
        -- 08-21-25
        (jjdog_id, jjdog_id, '2025-08-21', 'rise', true, '2025-08-21 20:00:00+00'),
        (skye_id, skye_id, '2025-08-21', 'spark', true, '2025-08-21 21:15:00+00'),
        (sadie_id, sadie_id, '2025-08-21', 'glow', true, '2025-08-21 21:30:00+00'),
        
        -- 08-22-25
        (jjdog_id, jjdog_id, '2025-08-22', 'stillness', true, '2025-08-22 19:45:00+00'),
        (skye_id, skye_id, '2025-08-22', 'glow', true, '2025-08-22 20:30:00+00'),
        (sadie_id, sadie_id, '2025-08-22', 'shine', true, '2025-08-22 21:00:00+00'),
        
        -- 08-23-25 (skye misses)
        (jjdog_id, jjdog_id, '2025-08-23', 'peace', true, '2025-08-23 20:15:00+00'),
        (sadie_id, sadie_id, '2025-08-23', 'calm', true, '2025-08-23 21:30:00+00'),
        
        -- 08-24-25
        (jjdog_id, jjdog_id, '2025-08-24', 'anchor', true, '2025-08-24 18:30:00+00'),
        (skye_id, skye_id, '2025-08-24', 'hope', true, '2025-08-24 20:00:00+00'),
        (sadie_id, sadie_id, '2025-08-24', 'faith', true, '2025-08-24 21:15:00+00'),
        
        -- 08-25-25 (today - add others)
        (skye_id, skye_id, '2025-08-25', 'mine', true, '2025-08-25 00:16:45+00'),
        (sadie_id, sadie_id, '2025-08-25', 'today', true, '2025-08-25 01:00:00+00');
    
    -- Add some journal entries
    INSERT INTO journal_entries (user_id, date_local, word, reflections, created_at)
    VALUES 
        (jjdog_id, '2025-08-20', 'reflect', 'feeling grateful today', '2025-08-20 22:00:00+00'),
        (jjdog_id, '2025-08-22', 'pause', 'need to slow down', '2025-08-22 21:30:00+00'),
        (skye_id, '2025-08-21', 'breathe', 'finding peace in the moment', '2025-08-21 22:15:00+00'),
        (sadie_id, '2025-08-23', 'grateful', 'appreciating the little things', '2025-08-23 21:45:00+00');
    
    RAISE NOTICE 'Seed data created successfully!';
    RAISE NOTICE 'Users: jjdog (%), skye (%), sadie (%)', jjdog_id, skye_id, sadie_id;
    
END $$;
