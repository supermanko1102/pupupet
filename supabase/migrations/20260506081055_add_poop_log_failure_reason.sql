alter table public.poop_logs
  add column if not exists failure_reason text
    check (failure_reason in ('not_poop', 'unclear', 'system_error'));

comment on column public.poop_logs.failure_reason is
  'Failed analysis category: not_poop/unclear are user-photo suitability outcomes; system_error is service or processing failure.';
