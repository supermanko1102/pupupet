-- ============================================================
-- PupuPet baseline schema + queue helpers
-- This migration is intentionally idempotent so the repository can
-- rebuild a fresh local database while remaining safe against an
-- already-provisioned remote project.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- ─── Core tables ─────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null
    check (char_length(trim(name)) >= 1 and char_length(trim(name)) <= 50),
  species text not null default 'dog'
    check (species in ('dog', 'cat', 'other')),
  notes text,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  breed text,
  birthday date,
  weight_kg numeric(4,1)
);

create table if not exists public.poop_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  image_path text,
  captured_at timestamp with time zone not null default timezone('utc'::text, now()),
  status text not null default 'uploaded'
    check (status in ('uploaded', 'analyzing', 'done', 'failed')),
  bristol_score integer
    check (bristol_score >= 1 and bristol_score <= 7),
  consistency text,
  color text,
  risk_level text
    check (risk_level in ('normal', 'observe', 'vet')),
  summary text,
  recommendation text,
  model_version text,
  confidence numeric
    check (confidence >= 0 and confidence <= 1),
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  ai_raw_json jsonb,
  entry_mode text not null default 'photo_ai'
    check (entry_mode in ('quick_log', 'photo_ai')),
  manual_status text
    check (manual_status in ('normal', 'soft', 'hard', 'abnormal', 'unknown')),
  note text
);

create index if not exists pets_user_id_created_at_idx
  on public.pets (user_id, created_at desc);

create index if not exists poop_logs_user_id_captured_at_idx
  on public.poop_logs (user_id, captured_at desc);

create index if not exists poop_logs_pet_id_captured_at_idx
  on public.poop_logs (pet_id, captured_at desc);

-- ─── Auth profile bootstrap ──────────────────────────────────────────────────

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

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'on_auth_user_created'
      and tgrelid = 'auth.users'::regclass
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end;
$$;

-- ─── RLS policies ────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.pets enable row level security;
alter table public.poop_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles are viewable by owner'
  ) then
    create policy "profiles are viewable by owner"
      on public.profiles
      for select
      using ((select auth.uid()) = id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles can be inserted by owner'
  ) then
    create policy "profiles can be inserted by owner"
      on public.profiles
      for insert
      with check ((select auth.uid()) = id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'pets'
      and policyname = 'pets are manageable by owner'
  ) then
    create policy "pets are manageable by owner"
      on public.pets
      for all
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'poop_logs'
      and policyname = 'poop logs are manageable by owner'
  ) then
    create policy "poop logs are manageable by owner"
      on public.poop_logs
      for all
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;
end;
$$;

-- ─── Storage bucket + policies ───────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('poop-photos', 'poop-photos', false)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'users can upload own poop photos'
  ) then
    create policy "users can upload own poop photos"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'poop-photos'
        and (storage.foldername(name))[1] = (select auth.uid())::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'users can read own poop photos'
  ) then
    create policy "users can read own poop photos"
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'poop-photos'
        and (storage.foldername(name))[1] = (select auth.uid())::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'users can update own poop photos'
  ) then
    create policy "users can update own poop photos"
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'poop-photos'
        and (storage.foldername(name))[1] = (select auth.uid())::text
      )
      with check (
        bucket_id = 'poop-photos'
        and (storage.foldername(name))[1] = (select auth.uid())::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'users can delete own poop photos'
  ) then
    create policy "users can delete own poop photos"
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'poop-photos'
        and (storage.foldername(name))[1] = (select auth.uid())::text
      );
  end if;
end;
$$;

-- ─── Queue helpers ───────────────────────────────────────────────────────────

create or replace function public.claim_poop_job()
returns table(job_id uuid, job_image_path text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with claimed as (
    select id, image_path
    from public.poop_logs
    where status = 'uploaded'
      and image_path is not null
    order by created_at asc
    limit 1
    for update skip locked
  )
  update public.poop_logs pl
  set status = 'analyzing'
  from claimed
  where pl.id = claimed.id
  returning pl.id as job_id, pl.image_path as job_image_path;
end;
$$;

create or replace function public.reset_stuck_jobs()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.poop_logs
  set status = 'uploaded'
  where status = 'analyzing'
    and created_at < now() - interval '5 minutes';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ============================================================
-- Optional pg_cron schedules:
--
-- select cron.schedule(
--   'reset-stuck-poop-jobs',
--   '*/5 * * * *',
--   $$ select public.reset_stuck_jobs() $$
-- );
--
-- The analysis worker should be invoked by a scheduled Edge Function
-- or another trusted server-side trigger. Do not commit service-role
-- tokens into migrations.
-- ============================================================
