-- Create only the missing tables (skip if they already exist)
create extension if not exists "uuid-ossp";

-- Only create users table if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.tables where table_name = 'users') then
    create table users (
      id uuid primary key default uuid_generate_v4(),
      email text unique not null,
      name text,
      is_premium boolean default false,
      created_at timestamptz default now()
    );
  end if;
end $$;

-- Only create connections table if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.tables where table_name = 'connections') then
    create table connections (
      id uuid primary key default uuid_generate_v4(),
      user_a uuid references users(id) on delete cascade,
      user_b uuid references users(id) on delete cascade,
      created_at timestamptz default now(),
      unique (user_a, user_b)
    );
  end if;
end $$;

-- Only create reveal_type enum if it doesn't exist
do $$
begin
  if not exists (select 1 from pg_type where typname = 'reveal_type') then
    create type reveal_type as enum ('instant','mutual','scheduled');
  end if;
end $$;

-- Only create words table if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.tables where table_name = 'words') then
    create table words (
      id uuid primary key default uuid_generate_v4(),
      sender_id uuid references users(id) on delete cascade,
      receiver_id uuid references users(id) on delete cascade,
      date_local date not null,
      text text not null,
      reveal reveal_type not null default 'instant',
      reveal_time timestamptz,
      burn_if_unread boolean default false,
      created_at timestamptz default now(),
      unique (sender_id, receiver_id, date_local)
    );
  end if;
end $$;

-- Only create public_words table if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.tables where table_name = 'public_words') then
    create table public_words (
      id uuid primary key default uuid_generate_v4(),
      user_id uuid references users(id) on delete cascade,
      date_local date not null,
      text text not null,
      created_at timestamptz default now()
    );
  end if;
end $$;
