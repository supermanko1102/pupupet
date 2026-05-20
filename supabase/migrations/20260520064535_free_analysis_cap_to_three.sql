-- 將免費分析次數上限從 5 改成 3。
-- 既有使用者的 free_analysis_remaining 保持原值（可能仍是 4 或 5），
-- 用完後才會走新的 3 次上限；不會被「倒扣」。

alter table public.billing_accounts
  alter column free_analysis_remaining set default 3;

-- 重新定義 refund 函式，把退回上限改成 3。
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
    set free_analysis_remaining = least(free_analysis_remaining + 1, 3)
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
