-- Deleting a pet should keep historical logs and move them back to
-- "unclassified" instead of deleting the logs.

alter table public.poop_logs
  drop constraint if exists poop_logs_pet_id_fkey;

alter table public.poop_logs
  add constraint poop_logs_pet_id_fkey
  foreign key (pet_id)
  references public.pets(id)
  on delete set null;
