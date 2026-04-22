# API 文件

> 上次同步：2026-04-22

---

## 架構總覽

```
App (Expo)  ──Supabase JS SDK──►  Supabase
                                    ├── Auth (Apple Sign In)
                                    ├── REST API (DB)
                                    └── Storage (poop-photos)
                                         │
                              poop_logs INSERT webhook
                                         ▼
                            Edge Function: analyze-poop
                                         │
                              Claude Vision API (claude-opus-4-5)
```

---

## Supabase Auth

### Apple Sign In
- 套件：`expo-apple-authentication`
- 流程：`AppleAuthentication.signInAsync()` → 取得 `identityToken` → `supabase.auth.signInWithIdToken({ provider: 'apple', token })`
- 成功後：`on_auth_user_created` trigger 自動建立 `profiles` row
- Session 持久化：`AsyncStorage`

### Session 管理（`providers/session-provider.tsx`）
- `isReady`：初始 session 載入完成才為 true（防止閃爍）
- `user`：`session?.user ?? null`
- `onAuthStateChange`：監聽登入/登出事件自動更新

---

## Supabase REST（Client SDK）

所有請求使用 anon key，受 RLS 保護，只能存取自己的資料。

### Pets

| 操作 | 程式碼 |
|------|--------|
| 列出所有寵物 | `supabase.from('pets').select('*').order('created_at', { ascending: false })` |
| 取最舊一筆（設定頁） | `supabase.from('pets').select('*').order('created_at', { ascending: true }).limit(1).single()` |
| 新增寵物 | `supabase.from('pets').insert({ name, species: 'dog' }).select().single()` |
| 更新寵物 | `supabase.from('pets').update({ name, breed, weight_kg }).eq('id', petId)` |

### Poop Logs

| 操作 | 程式碼 |
|------|--------|
| 建立新 log（觸發 AI 分析） | `supabase.from('poop_logs').insert({ pet_id, image_path, status: 'uploaded' }).select('id, image_path').single()` |
| 輪詢分析狀態 | `supabase.from('poop_logs').select('status, bristol_score, risk_level, summary, recommendation').eq('id', logId).single()` |
| 載入首頁紀錄（最近8筆） | `supabase.from('poop_logs').select('id, captured_at, image_path, status, summary, risk_level, bristol_score, pets(name)').order('captured_at', { ascending: false }).limit(8)` |

### Storage

| 操作 | 說明 |
|------|------|
| 上傳照片 | `supabase.storage.from('poop-photos').upload(filePath, arrayBuffer, { contentType, upsert: false })` |
| 取得 signed URL | `supabase.storage.from('poop-photos').createSignedUrl(path, 3600)` |

**上傳路徑格式：** `{userId}/{Date.now()}-{6位random}.{ext}`

---

## Edge Function：`analyze-poop`

**路徑：** `supabase/functions/analyze-poop/index.ts`

**觸發方式：** Supabase Database Webhook — `poop_logs` 表 INSERT 事件

**執行環境：** Deno（Supabase Edge Functions）

### 流程

```
1. 接收 webhook payload（type: 'INSERT', table: 'poop_logs'）
2. 更新 status → 'analyzing'
3. 從 Storage 下載圖片，轉 base64
4. 呼叫 Claude Vision API
5. 解析 JSON 結果
6. 更新 poop_logs（status → 'done'，填入所有分析欄位）

錯誤時：更新 status → 'failed'
```

### 環境變數

| 變數 | 說明 |
|------|------|
| `SUPABASE_URL` | Supabase 專案 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key（繞過 RLS，供 Edge Function 寫入用） |
| `ANTHROPIC_API_KEY` | Claude API 金鑰 |

### Claude Vision 請求

- **Model：** `claude-opus-4-5`
- **max_tokens：** 1024
- **Input：** 圖片（base64 JPEG）+ 分析 prompt
- **Output（JSON）：**

```json
{
  "bristolScore": 4,
  "color": "brown",
  "consistency": "normal",
  "riskLevel": "normal",
  "summary": "糞便外觀正常，無異狀",
  "recommendation": "維持現有飲食與運動習慣即可",
  "confidence": 0.92
}
```

| 欄位 | 型別 | 說明 |
|------|------|------|
| `bristolScore` | int \| null | 1–7，無法判斷填 null |
| `color` | string | `brown` \| `yellow` \| `black` \| `red` \| `green` \| `other` |
| `consistency` | string | `hard` \| `normal` \| `soft` \| `liquid` |
| `riskLevel` | string | `normal` \| `observe` \| `vet` |
| `summary` | string | ≤20 字中文摘要 |
| `recommendation` | string | ≤50 字中文建議 |
| `confidence` | float | 0.0–1.0 |

**riskLevel 判斷標準：**
- `normal`：外觀正常，無異狀
- `observe`：顏色或形狀略有異常，建議多觀察
- `vet`：明顯異常（血便、黑便、嚴重腹瀉等），建議就醫

### updateLog（內部 helper）

直接呼叫 Supabase REST API（PATCH）更新 poop_logs，使用 service role key 繞過 RLS。

```
PATCH {SUPABASE_URL}/rest/v1/poop_logs?id=eq.{logId}
Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}
```

---

## App 環境變數（`.env.local`）

| 變數 | 說明 |
|------|------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase 專案 URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key（公開，受 RLS 保護） |

---

## 分析輪詢流程（App 側）

```
uploadAsset()
  └── uploadPoopPhoto()         → Storage upload
  └── poop_logs.insert()        → status: 'uploaded'（webhook 觸發）
  └── startPolling(logId)       → setInterval 2000ms

每 2 秒：
  poop_logs.select(status,...)
    ├── status === 'done'  → 顯示結果 modal，停止輪詢
    └── status === 'failed' → 顯示失敗訊息，停止輪詢
```

> 未來可考慮改用 Supabase Realtime 訂閱取代輪詢，降低請求量。
