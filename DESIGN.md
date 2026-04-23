# PupuPet Design System

> 設計基調：輕盈、乾淨、讓人放心。不是診療室，是陪伴工具。

---

## 1. 設計原則

**低摩擦優先**
介面的每一層都在問：「這一步有沒有辦法省掉？」能預設的不讓使用者選，能隱藏的不佔版面。

**狀態比數字重要**
使用者要的不是精確數字，是「現在好不好」。顏色、icon、一句話比圖表更先被看到。

**不製造焦慮**
異常要讓人知道，但不要讓人緊張。紅色謹慎使用，通常搭配行動建議一起出現，不單獨出現。

**遊戲感是點綴，不是主體**
圖鑑、成就用來讓每次記錄有一點小回饋。不搶健康工具的信任感。

---

## 2. 色彩系統

### 主色

| Token | Hex | 用途 |
|---|---|---|
| `brand` | `#20B2AA` | 品牌色、主要 CTA、tint、active state |
| `brand-dark` | `#006a65` | Header icon、深色強調 |
| `brand-subtle` | `rgba(32, 178, 170, 0.08)` | 頁面漸層背景起點 |
| `brand-light` | `#f0fdf9` | Trend card 背景、subtle highlight |

### 中性色

| Token | Hex | 用途 |
|---|---|---|
| `ink-primary` | `#171d1c` | 主要文字、標題 |
| `ink-secondary` | `#3c4948` | 內文、次要說明 |
| `ink-tertiary` | `#6c7a78` | Label、placeholder、meta 資訊 |
| `ink-disabled` | `#bbc9c7` | 空狀態、disabled 文字 |
| `surface-default` | `#ffffff` | 頁面背景 |
| `surface-raised` | `#f5fbf9` | Card 背景 |
| `border` | `#e3e9e8` | Card 邊框、分隔線 |

### 語意色

| 狀態 | 背景 | 邊框 / 深色 | 文字 | 用途 |
|---|---|---|---|---|
| **正常 / success** | `#d8f3e8` | `#6ee7b7` | `#065f46` | risk: normal, manual: normal |
| **觀察 / warning** | `#fef3c7` | `#fcd34d` | `#92400e` | risk: observe, manual: soft/hard |
| **就醫 / danger** | `#fde8e8` | `#fca5a5` | `#9a3412` | risk: vet, manual: abnormal |
| **中性 / neutral** | `#e9efed` | `#bbc9c7` | `#3c4948` | 待分析、未知狀態 |

### 語意色 — 點狀指示（stats-panel）

| 狀態 | Hex |
|---|---|
| 正常 | `#20B2AA` |
| 觀察 | `#f59e0b` |
| 就醫 | `#ef4444` |
| 無紀錄 | `#e3e9e8` |

---

## 3. 字體系統

**字體族**：系統字體（`system-ui` / SF Pro），中文搭配系統預設，圓體風格。

### 字級規格

| 名稱 | fontSize | fontWeight | letterSpacing | 用途 |
|---|---|---|---|---|
| `display` | 28 | 800 | -0.5 | 頁面大標題（統計頁） |
| `title-xl` | 26 | 700 | -0.5 | 首頁 Hero 標題 |
| `title-lg` | 24 | 700 | — | Modal 標題、Quick log 標題 |
| `title-md` | 22 | 700 | — | 分析中文字、Done 標題 |
| `title-sm` | 18 | 700 | — | Risk banner 標題、Modal 副標 |
| `body-lg` | 17 | 700 | — | 主要按鈕文字 |
| `body-md` | 16 | 700 | — | CTA card 標題、Quick status label |
| `body-base` | 15 | 600 | — | Card pet name、info value |
| `body-base-regular` | 15 | 400 / 500 | — | 內文說明、建議文字 |
| `caption` | 13 | 600 | 0.5 | Section header、label uppercase |
| `caption-sm` | 12 | 700 | — | StatusPill、CardDate |
| `micro` | 11 | 600 | — | Tab label、Day label |

### 使用原則

- 標題統一 `fontWeight: 700` 以上
- **不用純 400 weight 做標題**，會顯得軟
- `letterSpacing: -0.5` 只用在大標題（26px+），讓中文不顯得太鬆散
- Section header 永遠搭配 `textTransform: 'uppercase'` + `letterSpacing: 0.5`

---

## 4. 間距系統

使用 4px 基礎單位，常用值：

| Token | px | 常見用途 |
|---|---|---|
| `space-1` | 4 | 內部微間距（icon + label gap） |
| `space-2` | 8 | Pill padding、小 gap |
| `space-3` | 12 | Card padding、row gap |
| `space-4` | 16 | Section padding、banner padding |
| `space-5` | 20 | 頁面水平 padding、modal body padding |
| `space-6` | 24 | Modal actions padding、大 gap |
| `space-8` | 32 | Hero section margin |
| `space-10` | 40 | ScrollView paddingBottom、Hero margin |

---

## 5. 圓角系統

| Token | radius | 用途 |
|---|---|---|
| `radius-sm` | 10 | 小按鈕、pet picker button |
| `radius-md` | 12 | Info row、recommend box、image thumb |
| `radius-lg` | 16 | Risk banner、modal button、tracking notice |
| `radius-xl` | 20 | Card（首頁 log card、history card） |
| `radius-full` | 999 | Pill、dot、圓形按鈕 |

---

## 6. 元件規格

### 6.1 CTA Card（首頁雙入口）

```
尺寸：flex: 1，paddingVertical: 24，borderRadius: 20
主要（快速記錄）：backgroundColor #20B2AA + shadow
  shadow: color #20B2AA, offset (0,6), opacity 0.3, radius 14, elevation 8
次要（拍照分析）：backgroundColor #f5fbf9 + border #e3e9e8
Icon wrap：52×52，borderRadius: 999，backgroundColor rgba(...)
Title：16px / 700
Sub：12px，opacity 0.75（主要用白色，次要用 #6c7a78）
Press state：scale 0.97 + opacity 0.9
```

### 6.2 Log Card

```
首頁版（垂直）：
  container: padding 12, borderRadius 20, border #e3e9e8, bg #f5fbf9
  圖片區：height 140（有圖）/ height 80（快速記錄 emoji block）
  meta: petName 15/600, date 13 #6c7a78, summary 14 lineHeight 20

歷程頁版（水平）：
  container: flexDirection row, padding 12, borderRadius 20
  縮圖：80×80，borderRadius 12
  快速記錄縮圖：80×80 colored block，居中 emoji 32px
```

### 6.3 StatusPill

```
borderRadius: 999
paddingHorizontal: 10, paddingVertical: 4
fontSize: 12, fontWeight: 700
顏色：依語意色系 success / warning / danger / neutral
```

### 6.4 Risk Banner（拍照分析結果）

```
flexDirection: row, alignItems: center, gap: 14
padding: 16, borderRadius: 16, borderWidth: 1
icon: fontSize 32（emoji）
title: 18/700
sub: 14, marginTop 2, opacity 0.8
顏色：依語意色系
```

### 6.5 Primary Button

```
height: 54, borderRadius: 16
backgroundColor: #20B2AA
text: 17/700, color #ffffff
disabled: opacity 0.4
loading: ActivityIndicator color #ffffff
```

### 6.6 Ghost Button

```
height: 54, borderRadius: 16
backgroundColor: #e9efed
text: 17/600, color #3c4948
```

### 6.7 Trend Summary Card（歷程頁頂部）

```
backgroundColor: #f0fdf9
borderColor: #6ee7b7, borderWidth: 1
borderRadius: 16, padding: 16
marginHorizontal: 20, marginTop: 16
左側 icon：Ionicons 20px，顏色依異常狀態
message：15/600，顏色依異常狀態
count：13 #6c7a78，marginLeft 28
```

### 6.8 Section Header

```
fontSize: 13, fontWeight: 700
color: #6c7a78
letterSpacing: 0.5
textTransform: uppercase
paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8
```

### 6.9 Tracking Notice

```
backgroundColor: #fef3c7
borderRadius: 12, padding: 12
flexDirection: row, gap: 8
icon: Ionicons notifications-outline 16px, color #92400e
text: 14/500, color #92400e
```

---

## 7. 狀態系統

### risk_level（拍照 AI 分析）

| 值 | 標籤 | Icon | Pill tone |
|---|---|---|---|
| `normal` | 正常 | ✅ | success |
| `observe` | 觀察 | ⚠️ | warning |
| `vet` | 就醫 | 🏥 | danger |
| `null` / 待分析 | 待分析 | 📋 | neutral |

### manual_status（快速記錄）

| 值 | 標籤 | Emoji | Bg 色 | Pill tone |
|---|---|---|---|---|
| `normal` | 正常 | ✅ | `#d8f3e8` | success |
| `soft` | 偏軟 | 🟡 | `#fef3c7` | warning |
| `hard` | 偏硬 | 🟤 | `#fef3c7` | warning |
| `abnormal` | 異常 | 🚨 | `#fde8e8` | danger |
| `unknown` | 未知 | ❓ | `#e9efed` | neutral |

### 異常追蹤規則

記錄完成後，以下情況觸發次日推播提醒：
- `risk_level === 'vet'` 或 `'observe'`（拍照分析）
- `manual_status === 'abnormal'` 或 `'soft'`（快速記錄）

---

## 8. 動畫規格

### 漢堡選單

```
開啟：Animated.timing toValue 1，duration 220ms，useNativeDriver
關閉：Animated.timing toValue 0，duration 180ms，useNativeDriver
menu icon opacity：inputRange [0,0.4,1] → [1,0,0]
close icon opacity：inputRange [0,0.6,1] → [0,0,1]
close icon rotate：0deg → 0deg（進場 -90deg → 0deg）
```

### Modal

```
presentationStyle: pageSheet
animationType: slide
```

### 按鈕 press

```
transform: scale(0.97)
opacity: 0.9
```

---

## 9. 資訊層級

每個頁面的視覺重量順序：

**首頁**
1. Hero 標題（你要做什麼）
2. 雙 CTA（怎麼做）
3. 最近紀錄（做了什麼）

**歷程頁**
1. 趨勢摘要（現在整體狀況）
2. 時間分組標題（什麼時候）
3. 紀錄卡列表（每一筆細節）

**分析結果 Modal**
1. Risk banner（最重要的結論）
2. 建議（行動方向）
3. 追蹤提醒（後續）
4. 寵物分類（補充 metadata）

---

## 10. 不做的事

- **不用純黑 `#000000`** — 使用 `#171d1c`，比較柔和
- **不用純白背景做 card** — card 用 `#f5fbf9`，和頁面背景有微差距感
- **不在 card 裡放超過兩行的說明文字** — 超過兩行一律 `numberOfLines={2}`
- **不把異常用紅色大標題強調** — 紅色出現時永遠搭配說明或建議，不單獨用來「警告」
- **不用 shadow 在 secondary button 上** — shadow 只給主要 CTA，讓視覺焦點清楚
- **不用 border-radius 小於 10** — 整個 app 視覺語言是「圓、軟、現代」

---

## 11. 未來元件（待設計）

以下是 Roadmap 規劃但尚未實作的 UI 元件，設計時可提前參考：

### 圖鑑卡（catalog card）
- 已解鎖：顯示便便類型圖示 + 名稱 + 稀有度
- 未解鎖：灰階模糊 + 解鎖條件說明
- 觸發：來自「經歷過的便便類型」，非記錄次數

### 成就徽章
- 小圓形徽章 + emoji + 成就名稱
- 解鎖動畫：scale up + fade in

### 解鎖提示（記錄完成後）
- 輕量 toast 或 bottom sheet
- 不打斷主流程，可滑掉

### Onboarding 步驟
- 3 步以內，無需建寵物才能開始
- 第一個動作：完成第一筆快速記錄
