alter table public.poop_logs
  add column if not exists ai_observation text,
  add column if not exists ai_findings text[] not null default '{}'::text[],
  add column if not exists ai_possible_reasons text[] not null default '{}'::text[],
  add column if not exists ai_next_step text,
  add column if not exists ai_watch_items text[] not null default '{}'::text[],
  add column if not exists ai_escalation_signs text[] not null default '{}'::text[];

update public.poop_logs
set
  ai_observation = coalesce(ai_observation, summary),
  ai_next_step = coalesce(ai_next_step, recommendation),
  ai_findings = coalesce(ai_findings, '{}'::text[]),
  ai_possible_reasons = coalesce(ai_possible_reasons, '{}'::text[]),
  ai_watch_items = coalesce(ai_watch_items, '{}'::text[]),
  ai_escalation_signs = coalesce(ai_escalation_signs, '{}'::text[]);

comment on column public.poop_logs.ai_observation is
  'AI photo observation written for pet owners without medical risk grading.';
comment on column public.poop_logs.ai_findings is
  'Visible findings from the photo, such as color, shape, or consistency notes.';
comment on column public.poop_logs.ai_possible_reasons is
  'Non-diagnostic possible context for visible findings.';
comment on column public.poop_logs.ai_next_step is
  'Suggested next observation step for the owner.';
comment on column public.poop_logs.ai_watch_items is
  'Current items worth watching in future bowel movements.';
comment on column public.poop_logs.ai_escalation_signs is
  'Future signs that should prompt contacting a veterinarian.';
