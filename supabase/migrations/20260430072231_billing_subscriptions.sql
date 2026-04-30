-- PupuPet Plus subscription state and AI analysis quota accounting.

create table if not exists public.billing_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revenuecat_app_user_id text not null,
  subscription_status text not null default 'inactive'
    check (subscription_status in ('inactive', 'active', 'billing_issue', 'cancelled', 'expired', 'unknown')),
  entitlement_id text,
  product_id text,
  store text,
  environment text,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  monthly_analysis_limit integer not null default 60
    check (monthly_analysis_limit >= 0),
  monthly_analysis_used integer not null default 0
    check (monthly_analysis_used >= 0),
  free_analysis_remaining integer not null default 5
    check (free_analysis_remaining >= 0),
  last_revenuecat_event_at timestamp with time zone,
  last_synced_at timestamp with time zone,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  check (monthly_analysis_used <= monthly_analysis_limit)
);

create table if not exists public.analysis_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_id uuid not null unique references public.poop_logs(id) on delete cascade,
  source text not null check (source in ('free', 'subscription')),
  billing_period_start timestamp with time zone,
  billing_period_end timestamp with time zone,
  refunded_at timestamp with time zone,
  refund_reason text,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

create index if not exists analysis_usage_user_id_created_at_idx
  on public.analysis_usage (user_id, created_at desc);

create table if not exists public.billing_events (
  event_id text primary key,
  event_type text not null,
  app_user_id text,
  processed_at timestamp with time zone,
  processing_error text,
  raw_event jsonb not null,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.billing_accounts enable row level security;
alter table public.analysis_usage enable row level security;
alter table public.billing_events enable row level security;

drop policy if exists "poop logs are manageable by owner" on public.poop_logs;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'poop_logs'
      and policyname = 'poop logs are viewable by owner'
  ) then
    create policy "poop logs are viewable by owner"
      on public.poop_logs
      for select
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'poop_logs'
      and policyname = 'poop logs can be updated by owner'
  ) then
    create policy "poop logs can be updated by owner"
      on public.poop_logs
      for update
      to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'poop_logs'
      and policyname = 'poop logs can be deleted by owner'
  ) then
    create policy "poop logs can be deleted by owner"
      on public.poop_logs
      for delete
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'billing_accounts'
      and policyname = 'billing accounts are viewable by owner'
  ) then
    create policy "billing accounts are viewable by owner"
      on public.billing_accounts
      for select
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'analysis_usage'
      and policyname = 'analysis usage is viewable by owner'
  ) then
    create policy "analysis usage is viewable by owner"
      on public.analysis_usage
      for select
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;
end;
$$;

create or replace function public.touch_billing_accounts_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists set_billing_accounts_updated_at on public.billing_accounts;
create trigger set_billing_accounts_updated_at
  before update on public.billing_accounts
  for each row execute function public.touch_billing_accounts_updated_at();

insert into public.billing_accounts (user_id, revenuecat_app_user_id)
select id, id::text
from public.profiles
on conflict (user_id) do nothing;

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

  insert into public.billing_accounts (user_id, revenuecat_app_user_id)
  values (new.id, new.id::text)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace function public.sync_billing_account(
  p_user_id uuid,
  p_subscription_status text,
  p_entitlement_id text default null,
  p_product_id text default null,
  p_store text default null,
  p_environment text default null,
  p_period_start timestamp with time zone default null,
  p_period_end timestamp with time zone default null,
  p_event_at timestamp with time zone default null
)
returns public.billing_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.billing_accounts;
  v_reset_usage boolean := false;
  v_status text := coalesce(p_subscription_status, 'inactive');
begin
  if v_status not in ('inactive', 'active', 'billing_issue', 'cancelled', 'expired', 'unknown') then
    raise exception 'invalid subscription status: %', v_status
      using errcode = '22023';
  end if;

  insert into public.billing_accounts (user_id, revenuecat_app_user_id)
  values (p_user_id, p_user_id::text)
  on conflict (user_id) do nothing;

  select *
  into v_account
  from public.billing_accounts
  where user_id = p_user_id
  for update;

  v_reset_usage :=
    coalesce(v_account.current_period_start, '-infinity'::timestamp with time zone) is distinct from coalesce(p_period_start, '-infinity'::timestamp with time zone)
    or coalesce(v_account.current_period_end, '-infinity'::timestamp with time zone) is distinct from coalesce(p_period_end, '-infinity'::timestamp with time zone);

  update public.billing_accounts
  set subscription_status = v_status,
      entitlement_id = p_entitlement_id,
      product_id = p_product_id,
      store = p_store,
      environment = p_environment,
      current_period_start = p_period_start,
      current_period_end = p_period_end,
      monthly_analysis_used = case when v_reset_usage then 0 else monthly_analysis_used end,
      last_revenuecat_event_at = coalesce(p_event_at, last_revenuecat_event_at),
      last_synced_at = timezone('utc'::text, now())
  where user_id = p_user_id
  returning * into v_account;

  return v_account;
end;
$$;

create or replace function public.create_photo_analysis_log(
  p_user_id uuid,
  p_image_path text
)
returns table(
  log_id uuid,
  image_path text,
  usage_source text,
  free_analysis_remaining integer,
  subscription_analysis_remaining integer,
  current_period_end timestamp with time zone,
  is_subscribed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.billing_accounts;
  v_log_id uuid;
  v_source text;
  v_subscription_active boolean;
  v_subscription_remaining integer;
begin
  if p_user_id is null then
    raise exception 'missing user id' using errcode = '22023';
  end if;

  if p_image_path is null or length(trim(p_image_path)) = 0 then
    raise exception 'missing image path' using errcode = '22023';
  end if;

  insert into public.billing_accounts (user_id, revenuecat_app_user_id)
  values (p_user_id, p_user_id::text)
  on conflict (user_id) do nothing;

  select *
  into v_account
  from public.billing_accounts
  where user_id = p_user_id
  for update;

  v_subscription_active :=
    v_account.subscription_status in ('active', 'billing_issue', 'cancelled')
    and v_account.current_period_end is not null
    and v_account.current_period_end > timezone('utc'::text, now());

  v_subscription_remaining := greatest(v_account.monthly_analysis_limit - v_account.monthly_analysis_used, 0);

  if v_subscription_active then
    if v_subscription_remaining <= 0 then
      raise exception 'analysis quota exceeded'
        using errcode = 'P0001';
    end if;

    update public.billing_accounts
    set monthly_analysis_used = monthly_analysis_used + 1
    where user_id = p_user_id
    returning * into v_account;

    v_source := 'subscription';
  elsif v_account.free_analysis_remaining > 0 then
    update public.billing_accounts
    set free_analysis_remaining = free_analysis_remaining - 1
    where user_id = p_user_id
    returning * into v_account;

    v_source := 'free';
  else
    raise exception 'analysis quota exceeded'
      using errcode = 'P0001';
  end if;

  insert into public.poop_logs (user_id, image_path, entry_mode, status)
  values (p_user_id, p_image_path, 'photo_ai', 'uploaded')
  returning id into v_log_id;

  insert into public.analysis_usage (
    user_id,
    log_id,
    source,
    billing_period_start,
    billing_period_end
  )
  values (
    p_user_id,
    v_log_id,
    v_source,
    case when v_source = 'subscription' then v_account.current_period_start else null end,
    case when v_source = 'subscription' then v_account.current_period_end else null end
  );

  return query
  select
    v_log_id,
    p_image_path,
    v_source,
    v_account.free_analysis_remaining,
    greatest(v_account.monthly_analysis_limit - v_account.monthly_analysis_used, 0),
    v_account.current_period_end,
    v_subscription_active;
end;
$$;

create or replace function public.refund_analysis_usage(
  p_log_id uuid,
  p_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usage public.analysis_usage;
begin
  select *
  into v_usage
  from public.analysis_usage
  where log_id = p_log_id
  for update;

  if not found or v_usage.refunded_at is not null then
    return false;
  end if;

  if v_usage.source = 'free' then
    update public.billing_accounts
    set free_analysis_remaining = least(free_analysis_remaining + 1, 5)
    where user_id = v_usage.user_id;
  elsif v_usage.source = 'subscription' then
    update public.billing_accounts
    set monthly_analysis_used = case
      when current_period_start is not distinct from v_usage.billing_period_start
        and current_period_end is not distinct from v_usage.billing_period_end
        then greatest(monthly_analysis_used - 1, 0)
      else monthly_analysis_used
    end
    where user_id = v_usage.user_id;
  end if;

  update public.analysis_usage
  set refunded_at = timezone('utc'::text, now()),
      refund_reason = p_reason
  where id = v_usage.id;

  return true;
end;
$$;

revoke all on function public.sync_billing_account(
  uuid, text, text, text, text, text, timestamp with time zone, timestamp with time zone, timestamp with time zone
) from public, anon, authenticated;
revoke all on function public.create_photo_analysis_log(uuid, text) from public, anon, authenticated;
revoke all on function public.refund_analysis_usage(uuid, text) from public, anon, authenticated;

grant execute on function public.sync_billing_account(
  uuid, text, text, text, text, text, timestamp with time zone, timestamp with time zone, timestamp with time zone
) to service_role;
grant execute on function public.create_photo_analysis_log(uuid, text) to service_role;
grant execute on function public.refund_analysis_usage(uuid, text) to service_role;
