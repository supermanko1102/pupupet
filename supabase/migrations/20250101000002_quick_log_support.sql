-- 支援快速記錄（無需拍照）
-- 改動：
--   1. image_path 改為 nullable（快速記錄不需要圖片）
--   2. 新增 entry_mode：記錄是快速記錄還是拍照分析
--   3. 新增 manual_status：快速記錄時由使用者手動選擇的狀態
--   4. 新增 note：可選的簡短備註

alter table poop_logs alter column image_path drop not null;

alter table poop_logs
  add column if not exists entry_mode text not null default 'photo_ai'
    check (entry_mode in ('quick_log', 'photo_ai')),
  add column if not exists manual_status text
    check (manual_status in ('normal', 'soft', 'hard', 'abnormal', 'unknown')),
  add column if not exists note text;

-- 快速記錄的 status 直接設為 'done'（不需要 AI 分析流程）
-- photo_ai 的 status 仍走原有的 uploaded → analyzing → done 流程
