-- Create tables for mood logs and crush info

-- Moods
create table if not exists public.mood_logs (
  id bigint generated always as identity primary key,
  client_id text not null,
  mood text not null,
  weather_main text,
  temp_c numeric,
  city text,
  created_at timestamptz not null default now()
);

-- Crush info
create table if not exists public.crushes (
  id uuid primary key default gen_random_uuid(),
  client_id text not null unique,
  name text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.mood_logs enable row level security;
alter table public.crushes enable row level security;

-- For this app, all DB access happens via server (service role) only.
-- We intentionally do not add anon policies, keeping data private by default.
