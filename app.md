# PupuPet（口袋便便）— 專案總覽

> 上次同步：2026-04-22

---

## 產品定位

拍一張寵物糞便照 → AI 即時分析健康狀態 → 飼主看到風險等級 + 建議

---

## 技術棧

| 層級 | 技術 |
|------|------|
| App | React Native + Expo Router（iOS 優先） |
| 後端 / DB | Supabase（Auth、PostgreSQL、Storage、Edge Functions） |
| AI | Claude Vision API（claude-opus-4-5）|
| 登入 | Apple Sign In（透過 Supabase Auth） |

---

## 目錄結構

```
pupupet/
├── app/                          # Expo 專案根目錄
│   ├── app/
│   │   ├── _layout.tsx           # Root layout，SessionProvider 包裹全局
│   │   ├── sign-in.tsx           # 登入頁（Apple Sign In）
│   │   └── (tabs)/
│   │       ├── _layout.tsx       # Tab bar，未登入時 redirect → /sign-in
│   │       ├── index.tsx         # 主頁：拍照 / 上傳 / 輪詢 / 結果
│   │       └── explore.tsx       # 設定頁：寵物資料 + 登出
│   ├── components/
│   │   └── apple-sign-in-card.tsx
│   ├── providers/
│   │   └── session-provider.tsx  # useSession hook，管理 auth 狀態
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client（anon key）
│   │   ├── uploads.ts            # uploadPoopPhoto()
│   │   └── env.ts                # 環境變數讀取與驗證
│   ├── types/
│   │   └── database.ts           # Supabase 型別定義（從 schema 生成）
│   ├── constants/
│   │   └── theme.ts
│   └── supabase/
│       ├── schema.sql            # 資料庫 DDL + RLS policies（source of truth）
│       └── functions/
│           └── analyze-poop/
│               └── index.ts      # Edge Function：AI 分析（Webhook 觸發）
├── docs/
│   ├── db.md                     # 資料庫欄位說明
│   └── api.md                    # API / Edge Function 說明
└── app.md                        # 本文件
```

---

## 核心功能流程

```
用戶拍照 / 選圖
  └── 上傳至 Storage（poop-photos bucket）
  └── 建立 poop_logs row（status: 'uploaded'）
        └── Webhook 觸發 analyze-poop Edge Function
              └── 更新 status → 'analyzing'
              └── 呼叫 Claude Vision API
              └── 更新 status → 'done'，寫入分析結果
  └── App 每 2 秒輪詢 status
        └── done → 顯示結果 modal（風險等級 / Bristol / 建議）
        └── failed → 顯示失敗提示
```

---

## 詳細文件

- **資料庫 schema：** [docs/db.md](docs/db.md)
- **API / Edge Function：** [docs/api.md](docs/api.md)

---

## MVP 現況

已完成：
- Apple Sign In + Session 管理
- 拍照 / 相簿選圖 + Storage 上傳
- Edge Function AI 分析（Claude Vision）
- 輪詢 + 結果 modal
- 設定頁（寵物資料編輯）
- 最近 8 筆紀錄首頁

待規劃：
- 多隻寵物切換
- 歷史紀錄完整列表頁
- 推播通知（分析完成）
- Realtime 訂閱取代輪詢
