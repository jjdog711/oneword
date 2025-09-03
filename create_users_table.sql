-- Create only the users table (the main missing table)
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  is_premium boolean default false,
  created_at timestamptz default now()
);
