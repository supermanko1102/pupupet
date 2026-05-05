-- 此 migration 為從遠端 schema_migrations 補回的歷史紀錄。
-- 原本是 hotfix：將 create_photo_analysis_log 內對 billing_accounts 欄位的引用全部加上 ba.* / v_account.* qualifier，
-- 解決 OUT TABLE 欄位 free_analysis_remaining 與資料表欄位同名造成的 ambiguous column 錯誤。

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
  from public.billing_accounts ba
  where ba.user_id = p_user_id
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

    update public.billing_accounts ba
    set monthly_analysis_used = ba.monthly_analysis_used + 1
    where ba.user_id = p_user_id
    returning ba.* into v_account;

    v_source := 'subscription';
  elsif v_account.free_analysis_remaining > 0 then
    update public.billing_accounts ba
    set free_analysis_remaining = ba.free_analysis_remaining - 1
    where ba.user_id = p_user_id
    returning ba.* into v_account;

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
