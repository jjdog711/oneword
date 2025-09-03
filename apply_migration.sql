-- OneWord App - Apply Migration 006_add_friend_requests.sql
-- Copy and paste this entire file into your Supabase Dashboard SQL Editor
-- Project: naxdkvmphzorykuzkaom

-- Add friend request system
-- This follows standard social networking patterns

-- Friend request status enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'request_status') then
    create type request_status as enum ('pending', 'accepted', 'declined', 'blocked');
  end if;
end $$;

-- Friend requests table
create table if not exists friend_requests (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid references users(id) on delete cascade,
  receiver_id uuid references users(id) on delete cascade,
  status request_status default 'pending',
  message text, -- Optional message with request
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (sender_id, receiver_id) -- One request per user pair
);

-- Notifications table for friend requests and other events
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  type text not null, -- 'friend_request', 'friend_accepted', 'word_received', etc.
  title text not null,
  body text,
  data jsonb, -- Additional data like request_id, sender_id, etc.
  read_at timestamptz,
  created_at timestamptz default now()
);

-- Privacy settings for friend requests
alter table settings add column if not exists allow_friend_requests boolean default true;
alter table settings add column if not exists allow_friend_requests_from text default 'anyone'; -- 'anyone', 'friends_of_friends', 'nobody'

-- Indexes for performance
create index if not exists idx_friend_requests_sender on friend_requests(sender_id);
create index if not exists idx_friend_requests_receiver on friend_requests(receiver_id);
create index if not exists idx_friend_requests_status on friend_requests(status);
create index if not exists idx_notifications_user_id on notifications(user_id);
create index if not exists idx_notifications_read_at on notifications(read_at);

-- Function to automatically create notifications for friend requests
create or replace function notify_friend_request()
returns trigger as $$
begin
  if new.status = 'pending' then
    insert into notifications (user_id, type, title, body, data)
    values (
      new.receiver_id,
      'friend_request',
      'New Friend Request',
      'You have a new friend request',
      jsonb_build_object(
        'request_id', new.id,
        'sender_id', new.sender_id,
        'message', new.message
      )
    );
  end if;
  return new;
end;
$$ language plpgsql;

-- Trigger to create notifications
drop trigger if exists friend_request_notification on friend_requests;
create trigger friend_request_notification
  after insert on friend_requests
  for each row
  execute function notify_friend_request();

-- Function to handle friend request acceptance
create or replace function accept_friend_request(request_id uuid)
returns void as $$
declare
  request_record friend_requests%rowtype;
begin
  -- Get the request
  select * into request_record from friend_requests where id = request_id;
  
  if not found then
    raise exception 'Friend request not found';
  end if;
  
  if request_record.status != 'pending' then
    raise exception 'Friend request is not pending';
  end if;
  
  -- Update request status
  update friend_requests 
  set status = 'accepted', updated_at = now()
  where id = request_id;
  
  -- Create connection
  insert into connections (user_a, user_b)
  values (request_record.sender_id, request_record.receiver_id)
  on conflict (user_a, user_b) do nothing;
  
  -- Create notification for sender
  insert into notifications (user_id, type, title, body, data)
  values (
    request_record.sender_id,
    'friend_accepted',
    'Friend Request Accepted',
    'Your friend request was accepted',
    jsonb_build_object(
      'request_id', request_id,
      'accepter_id', request_record.receiver_id
    )
  );
end;
$$ language plpgsql;

-- Function to handle friend request decline
create or replace function decline_friend_request(request_id uuid)
returns void as $$
declare
  request_record friend_requests%rowtype;
begin
  -- Get the request
  select * into request_record from friend_requests where id = request_id;
  
  if not found then
    raise exception 'Friend request not found';
  end if;
  
  if request_record.status != 'pending' then
    raise exception 'Friend request is not pending';
  end if;
  
  -- Update request status
  update friend_requests 
  set status = 'declined', updated_at = now()
  where id = request_id;
  
  -- Create notification for sender
  insert into notifications (user_id, type, title, body, data)
  values (
    request_record.sender_id,
    'friend_declined',
    'Friend Request Declined',
    'Your friend request was declined',
    jsonb_build_object(
      'request_id', request_id,
      'decliner_id', request_record.receiver_id
    )
  );
end;
$$ language plpgsql;

-- Function to block a user
create or replace function block_user(blocker_id uuid, blocked_id uuid)
returns void as $$
begin
  -- Update any existing friend request to blocked
  update friend_requests 
  set status = 'blocked', updated_at = now()
  where (sender_id = blocker_id and receiver_id = blocked_id)
     or (sender_id = blocked_id and receiver_id = blocker_id);
  
  -- Remove any existing connection
  delete from connections 
  where (user_a = blocker_id and user_b = blocked_id)
     or (user_a = blocked_id and user_b = blocker_id);
end;
$$ language plpgsql;

-- Verification queries (run these after the migration to confirm success)
-- SELECT 'Tables created successfully' as status;
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('friend_requests', 'notifications');
-- SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name IN ('notify_friend_request', 'accept_friend_request', 'decline_friend_request', 'block_user');


