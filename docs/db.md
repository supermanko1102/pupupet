# Database Schema

> 來源：`app/supabase/schema.sql` + `app/types/database.ts`
> 上次同步：2026-04-22

---

## 總覽

| 表格 | 說明 |
|------|------|
| `profiles` | 對應 Supabase Auth 用戶，signup 時由 trigger 自動建立 |
| `pets` | 用戶的寵物（一對多） |
| `poop_logs` | 每次拍照分析的紀錄（多對一 pets） |

Storage bucket：`poop-photos`（private）

---

## `profiles`

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | uuid PK | 對應 `auth.users.id` |
| `display_name` | text | 顯示名稱（nullable） |
| `avatar_url` | text | 頭像 URL（nullable） |
| `created_at` | timestamptz | 建立時間，預設 UTC now() |

**RLS：** 只有 owner 可 SELECT / INSERT（`auth.uid() = id`）

**Trigger：** `on_auth_user_created` — 新增 auth user 後自動 insert profiles row

---

## `pets`

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | uuid PK | gen_random_uuid() |
| `user_id` | uuid FK → auth.users | 預設 auth.uid() |
| `name` | text NOT NULL | 1–50 字元（trim 後） |
| `species` | text | `'dog'` \| `'cat'` \| `'other'`，預設 `'dog'` |
| `breed` | text | 品種（nullable） |
| `birthday` | date | 生日（nullable） |
| `weight_kg` | numeric(4,1) | 體重（nullable） |
| `notes` | text | 備註（nullable） |
| `created_at` | timestamptz | 建立時間 |

**Index：** `pets_user_id_created_at_idx` on `(user_id, created_at DESC)`

**RLS：** owner 可做所有操作（`auth.uid() = user_id`）

---

## `poop_logs`

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | uuid PK | gen_random_uuid() |
| `user_id` | uuid FK → auth.users | 預設 auth.uid() |
| `pet_id` | uuid FK → pets | 關聯的寵物 |
| `image_path` | text NOT NULL | Storage 路徑：`{user_id}/{timestamp}-{random}.{ext}` |
| `captured_at` | timestamptz | 拍照時間，預設 UTC now() |
| `status` | text NOT NULL | `'uploaded'` → `'analyzing'` → `'done'` \| `'failed'` |
| `bristol_score` | int | 1–7（Bristol Stool Scale），AI 填入，nullable |
| `color` | text | `'brown'` \| `'yellow'` \| `'black'` \| `'red'` \| `'green'` \| `'other'`，nullable |
| `consistency` | text | `'hard'` \| `'normal'` \| `'soft'` \| `'liquid'`，nullable |
| `risk_level` | text | `'normal'` \| `'observe'` \| `'vet'`，nullable |
| `summary` | text | AI 給飼主的一句話摘要（≤20字），nullable |
| `recommendation` | text | AI 建議（≤50字），nullable |
| `model_version` | text | 使用的 Claude model ID，nullable |
| `confidence` | numeric(4,3) | 0.000–1.000，AI 可信度，nullable |
| `ai_raw_json` | jsonb | Claude 完整回傳，備查，nullable |
| `created_at` | timestamptz | 建立時間 |

**Index：**
- `poop_logs_user_id_captured_at_idx` on `(user_id, captured_at DESC)`
- `poop_logs_pet_id_captured_at_idx` on `(pet_id, captured_at DESC)`

**RLS：** owner 可做所有操作（`auth.uid() = user_id`）

### status 狀態機

```
uploaded  →  analyzing  →  done
                       ↘  failed
```

- `uploaded`：App 插入新 row 時的初始狀態
- `analyzing`：Edge Function 收到 webhook，開始處理
- `done`：AI 分析完成，所有欄位已填入
- `failed`：處理途中拋出例外

---

## Storage：`poop-photos`

- **Visibility：** private（需 signed URL 才能讀取）
- **路徑格式：** `{user_id}/{Date.now()}-{6位random}.{ext}`
- **RLS policies：**
  - INSERT：`auth.uid()` 必須等於路徑第一個資料夾名稱
  - SELECT / UPDATE / DELETE：同上

**Signed URL 有效期：** App 側產生時設定 1 小時（`60 * 60`）
