-- Move scheduled Edge Function credentials into Supabase Vault and remove the
-- old direct insert webhook that embedded a service-role token in trigger args.

do $$
declare
  v_project_url text;
  v_anon_key text;
  v_secret_id uuid;
begin
  select ds.decrypted_secret
  into v_project_url
  from vault.decrypted_secrets ds
  where ds.name = 'project_url'
  order by ds.updated_at desc nulls last
  limit 1;

  if v_project_url is null then
    select substring(j.command from 'https://[^''"[:space:]]+\.supabase\.co')
    into v_project_url
    from cron.job j
    where j.jobname = 'process-poop-queue'
    order by j.jobid desc
    limit 1;
  end if;

  if v_project_url is null then
    raise exception 'Unable to infer Supabase project URL for process-poop-queue';
  end if;

  select ds.decrypted_secret
  into v_anon_key
  from vault.decrypted_secrets ds
  where ds.name = 'anon_key'
  order by ds.updated_at desc nulls last
  limit 1;

  if v_anon_key is null then
    select substring(j.command from 'Bearer ([^"]+)')
    into v_anon_key
    from cron.job j
    where j.jobname = 'process-poop-queue'
    order by j.jobid desc
    limit 1;
  end if;

  if v_anon_key is null then
    raise exception 'Unable to infer anon key for process-poop-queue';
  end if;

  select ds.id
  into v_secret_id
  from vault.decrypted_secrets ds
  where ds.name = 'project_url'
  order by ds.updated_at desc nulls last
  limit 1;

  if v_secret_id is null then
    perform vault.create_secret(
      v_project_url,
      'project_url',
      'Supabase project URL for scheduled Edge Function invocations'
    );
  else
    perform vault.update_secret(
      v_secret_id,
      v_project_url,
      'project_url',
      'Supabase project URL for scheduled Edge Function invocations'
    );
  end if;

  select ds.id
  into v_secret_id
  from vault.decrypted_secrets ds
  where ds.name = 'anon_key'
  order by ds.updated_at desc nulls last
  limit 1;

  if v_secret_id is null then
    perform vault.create_secret(
      v_anon_key,
      'anon_key',
      'Anon JWT used by pg_cron to invoke process-queue'
    );
  else
    perform vault.update_secret(
      v_secret_id,
      v_anon_key,
      'anon_key',
      'Anon JWT used by pg_cron to invoke process-queue'
    );
  end if;
end;
$$;

drop trigger if exists on_poop_log_insert on public.poop_logs;

select cron.unschedule('process-poop-queue')
where exists (
  select 1
  from cron.job
  where jobname = 'process-poop-queue'
);

select cron.schedule(
  'process-poop-queue',
  '* * * * *',
  $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/process-queue',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    ) as request_id;
  $$
);
