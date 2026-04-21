-- 啟用 UUID 擴充
create extension if not exists "uuid-ossp";

-- 1. users（對應 Supabase Auth，擴充欄位）
create table users (
id uuid primary key references auth.users(id) on delete cascade,
email text unique not null,
display_name text,
avatar_url text,
total_points int not null default 0,
created_at timestamptz not null default now()
);

-- 2. dogs（一個用戶可以有多隻狗）
create table dogs (
id uuid primary key default uuid_generate_v4(),
user_id uuid not null references users(id) on delete cascade,
name text not null,
breed text,
birthday date,
weight_kg numeric(4,1),
avatar_url text,
created_at timestamptz not null default now()
);

-- 3. card_definitions（角色卡定義，由你後台管理）
create table card_definitions (
id uuid primary key default uuid_generate_v4(),
name text not null,
description text,
rarity text not null check (rarity in ('common','rare','epic','legendary')),
trigger_condition text not null, -- e.g. 'bristol_eq_4', 'streak_gte_7'
illustration_url text,
created_at timestamptz not null default now()
);

-- 4. poop_logs（每次拍照記錄）
create table poop_logs (
id uuid primary key default uuid_generate_v4(),
dog_id uuid not null references dogs(id) on delete cascade,
image_url text not null,
bristol_score int check (bristol_score between 1 and 7),
color text, -- 'brown','yellow','black','red','green'
consistency text, -- 'hard','normal','soft','liquid'
ai_status text not null check (ai_status in ('normal','watch','vet')),
ai_summary text, -- 給用戶看的一句話
ai_raw_json jsonb, -- Claude 完整回傳，備查
points_earned int not null default 0,
card_unlocked_id uuid references card_definitions(id),
logged_at timestamptz not null default now()
);

-- 5. user_cards（用戶收藏的角色卡）
create table user_cards (
id uuid primary key default uuid_generate_v4(),
user_id uuid not null references users(id) on delete cascade,
card_def_id uuid not null references card_definitions(id),
poop_log_id uuid references poop_logs(id), -- 第一次解鎖的那筆記錄
count int not null default 1, -- 同一張卡可以重複獲得
first_unlocked_at timestamptz not null default now(),
unique (user_id, card_def_id)
);

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
insert into public.users (id, email)
values (new.id, new.email);
return new;
end;

$$
;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
$$
