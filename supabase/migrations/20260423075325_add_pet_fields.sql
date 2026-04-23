-- pets テーブルに breed / birthday / weight_kg を追加
-- schema.sql には定義済みだが remote に存在しないため補完

alter table public.pets
  add column if not exists breed text,
  add column if not exists birthday date,
  add column if not exists weight_kg numeric(4,1);