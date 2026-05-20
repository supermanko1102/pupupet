-- Apply this migration only after the new edge function and a client release
-- that no longer reads or writes risk_level have rolled out. Otherwise older
-- clients still in the field will hit "column risk_level does not exist".

alter table public.poop_logs
  drop column if exists risk_level;
