-- ============================================================
-- Queue helpers for poop analysis jobs
-- 使用 PostgreSQL 原生 FOR UPDATE SKIP LOCKED 實作 queue
-- 不需要額外 extension
-- ============================================================

-- 1. Claim 一筆最舊的 uploaded job（原子操作，防止重複處理）
--    回傳被 claim 的 job，沒有可用 job 則回傳空
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
    order by created_at asc
    limit 1
    for update skip locked   -- 跳過已被其他 worker claim 的 row，不等待
  )
  update public.poop_logs pl
  set status = 'analyzing'
  from claimed
  where pl.id = claimed.id
  returning pl.id as job_id, pl.image_path as job_image_path;
end;
$$;

-- 2. 重置卡在 'analyzing' 超過 5 分鐘的 job（自動 retry）
--    由 pg_cron 定期呼叫
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
-- 設定 pg_cron 排程（需先在 Supabase Dashboard 啟用 pg_cron extension）
-- 啟用後在 SQL Editor 執行以下語句：
--
-- select cron.schedule(
--   'reset-stuck-poop-jobs',
--   '*/5 * * * *',           -- 每 5 分鐘
--   $$ select public.reset_stuck_jobs() $$
-- );
--
-- 確認排程：
-- select * from cron.job;
--
-- 移除排程：
-- select cron.unschedule('reset-stuck-poop-jobs');
-- ============================================================
