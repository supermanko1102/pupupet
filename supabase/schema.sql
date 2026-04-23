create extension if not exists pgcrypto;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 50),
  species text not null default 'dog' check (species in ('dog', 'cat', 'other')),
  breed text,
  birthday date,
  weight_kg numeric(4,1),
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.poop_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pet_id uuid not null references public.pets (id) on delete cascade,
  image_path text not null,
  captured_at timestamptz not null default timezone('utc', now()),
  status text not null default 'uploaded' check (status in ('uploaded', 'analyzing', 'done', 'failed')),
  bristol_score int check (bristol_score between 1 and 7),
  consistency text,
  color text,
  risk_level text check (risk_level in ('normal', 'observe', 'vet')),
  summary text,
  recommendation text,
  model_version text,
  confidence numeric(4,3) check (confidence between 0 and 1),
  ai_raw_json jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists pets_user_id_created_at_idx
  on public.pets (user_id, created_at desc);

create index if not exists poop_logs_user_id_captured_at_idx
  on public.poop_logs (user_id, captured_at desc);

create index if not exists poop_logs_pet_id_captured_at_idx
  on public.poop_logs (pet_id, captured_at desc);

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.pets enable row level security;
alter table public.poop_logs enable row level security;

drop policy if exists "profiles are viewable by owner" on public.profiles;
create policy "profiles are viewable by owner"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "profiles can be inserted by owner" on public.profiles;
create policy "profiles can be inserted by owner"
  on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "pets are manageable by owner" on public.pets;
create policy "pets are manageable by owner"
  on public.pets
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "poop logs are manageable by owner" on public.poop_logs;
create policy "poop logs are manageable by owner"
  on public.poop_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('poop-photos', 'poop-photos', false)
on conflict (id) do nothing;

drop policy if exists "users can upload own poop photos" on storage.objects;
create policy "users can upload own poop photos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'poop-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users can read own poop photos" on storage.objects;
create policy "users can read own poop photos"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'poop-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users can update own poop photos" on storage.objects;
create policy "users can update own poop photos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'poop-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users can delete own poop photos" on storage.objects;
create policy "users can delete own poop photos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'poop-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
