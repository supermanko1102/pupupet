-- Avoid per-row re-evaluation of auth.uid() in RLS policies.
-- Supabase's database linter recommends wrapping auth helpers in a scalar
-- subquery so Postgres can use an initPlan.

alter policy "profiles are viewable by owner"
  on public.profiles
  using ((select auth.uid()) = id);

alter policy "profiles can be inserted by owner"
  on public.profiles
  with check ((select auth.uid()) = id);

alter policy "pets are manageable by owner"
  on public.pets
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy "poop logs are manageable by owner"
  on public.poop_logs
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy "users can upload own poop photos"
  on storage.objects
  with check (
    bucket_id = 'poop-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

alter policy "users can read own poop photos"
  on storage.objects
  using (
    bucket_id = 'poop-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

alter policy "users can update own poop photos"
  on storage.objects
  using (
    bucket_id = 'poop-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'poop-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

alter policy "users can delete own poop photos"
  on storage.objects
  using (
    bucket_id = 'poop-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
