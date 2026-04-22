-- 允許 poop_logs 不關聯寵物（未分類紀錄）
-- 改動前：pet_id NOT NULL（一定要有寵物才能記錄）
-- 改動後：pet_id nullable（可先記錄，之後再分類）

alter table poop_logs alter column pet_id drop not null;
