-- Initial schema for the OneWord app

create extension if not exists "uuid-ossp";

-- Users table stores basic account information.
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  name text,
  is_premium boolean default false,
  created_at timestamptz default now()
);

-- Connections represent a link between two users. Each pairing is unique.
create table if not exists connections (
  id uuid primary key default uuid_generate_v4(),
  user_a uuid references users(id) on delete cascade,
  user_b uuid references users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_a, user_b)
);

-- Enum for reveal type. Defines how words are revealed.
create type if not exists reveal_type as enum ('instant','mutual','scheduled');

-- Words table holds the daily messages between two users.
create table if not exists words (
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

-- Notes are private annotations on a word.
create table if not exists notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  word_id uuid references words(id) on delete cascade,
  text text not null,
  created_at timestamptz default now()
);

-- Favorites mark words as favorites for a given user.
create table if not exists favorites (
  user_id uuid references users(id) on delete cascade,
  word_id uuid references words(id) on delete cascade,
  primary key (user_id, word_id)
);

-- Journal entries store per-day reflections.
create table if not exists journal_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  date_local date not null,
  my_word text,
  reflections text,
  created_at timestamptz default now(),
  unique (user_id, date_local)
);

-- Public words are opt-in submissions to the global feed.
create table if not exists public_words (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  date_local date not null,
  text text not null,
  created_at timestamptz default now()
);

-- Settings hold per-user configuration values (notifications, theme, etc.).
create table if not exists settings (
  user_id uuid primary key references users(id) on delete cascade,
  notif_enabled boolean default true,
  reminder_time time,
  public_opt_in boolean default false,
  theme text default 'default',
  gamification_enabled boolean default true
);

-- Helpful indexes for querying today’s messages.
create index if not exists words_receiver_date_idx on words (receiver_id, date_local);
create index if not exists words_sender_date_idx on words (sender_id, date_local);