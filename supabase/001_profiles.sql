-- Run this in Supabase: SQL Editor -> New query -> paste -> Run
-- Creates the profiles table that stores each user's role (manager/client).
-- No insert/update policy is granted to regular users on purpose: nobody
-- can self-assign the manager role from the browser. Only this SQL editor
-- (or the Supabase dashboard) can set roles.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('manager','client')),
  initials text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Signed-in users can view profiles"
  on public.profiles for select
  using (auth.role() = 'authenticated');
