export type LegalPageKey = 'terms' | 'privacy' | 'disclaimer';

export type LegalSection = {
  heading: string;
  body: string;
};

export type LegalPage = {
  title: string;
  meta: string;
  alertBox?: string;
  sections: LegalSection[];
};

export const LEGAL_PAGES: Record<LegalPageKey, LegalPage> = {
  terms: {
    title: '使用條款',
    meta: '最後更新：2026 年 4 月',
    sections: [
      {
        heading: '1. 服務說明',
        body: 'PupuPet（口袋便便）是一款協助飼主記錄寵物排便狀況的行動應用程式。本服務提供快速記錄、AI 影像分析及健康趨勢摘要等功能。',
      },
      {
        heading: '2. 帳號責任',
        body: '您須對自己帳號下的所有活動負責。請妥善保管登入憑證，並於發現未授權使用情形時立即通知我們。',
      },
      {
        heading: '3. 內容使用',
        body: '您上傳的相片與記錄資料歸您所有。您授予 PupuPet 在提供服務所必要範圍內處理這些資料的權利。我們不會將您的內容用於服務以外的目的。',
      },
      {
        heading: '4. 服務變更與終止',
        body: '我們保留在合理通知後修改或終止服務的權利。您可隨時刪除帳號以終止使用。帳號刪除後，您的資料將在 30 天內自系統移除。',
      },
      {
        heading: '5. 適用法律',
        body: '本條款依中華民國法律解釋及適用。如有爭議，雙方同意以台灣台北地方法院為第一審管轄法院。',
      },
    ],
  },

  privacy: {
    title: '隱私政策',
    meta: '最後更新：2026 年 4 月',
    sections: [
      {
        heading: '我們收集哪些資料',
        body: '• 帳號資訊：Apple 登入提供的電子郵件地址。\n• 記錄資料：您手動輸入的排便時間、性狀、備註，以及所選擇的寵物資訊。\n• 上傳相片：您選擇上傳進行 AI 分析的寵物排便影像。',
      },
      {
        heading: 'AI 分析如何運作',
        body: '您上傳的相片會透過加密連線傳送至 Anthropic Claude API 進行視覺辨識分析。相片分析完成後，原始影像保留於您的個人儲存空間，分析結果文字儲存於資料庫。Anthropic 的資料處理方式請參閱其隱私政策。',
      },
      {
        heading: '資料儲存',
        body: '您的資料儲存於 Supabase 提供的雲端資料庫（伺服器位於美國）。我們採用行級安全性（RLS）確保您只能存取自己的資料，其他用戶無法讀取您的記錄。',
      },
      {
        heading: '我們不會做的事',
        body: '• 不將您的個人資料出售或出租給第三方。\n• 不使用您的相片或記錄進行廣告投放。\n• 不在未取得您明確同意前分享可識別身份的資料。',
      },
      {
        heading: '您的權利',
        body: '您可隨時在應用程式內查看、修改或刪除您的記錄。如需刪除帳號及所有相關資料，請至「設定 → 帳號管理」操作，或聯絡我們的支援信箱。',
      },
    ],
  },

  disclaimer: {
    title: '免責聲明',
    meta: '最後更新：2026 年 4 月',
    alertBox: 'PupuPet 的分析結果不構成獸醫診斷或醫療建議。',
    sections: [
      {
        heading: 'AI 分析的性質與限制',
        body: '本應用程式的 AI 影像分析功能旨在協助飼主初步辨識排便性狀，提供參考資訊。AI 模型可能因光線、角度、影像品質等因素產生誤判，其結果不應作為診斷依據。',
      },
      {
        heading: '請就醫的情況',
        body: '若您的寵物出現以下狀況，請立即聯繫獸醫，不要僅依賴本應用程式的分析：\n• 排便帶血或顏色異常（黑色、鮮紅）\n• 持續腹瀉或便秘超過 24 小時\n• 同時出現嘔吐、精神不振或食慾下降\n• 幼犬、幼貓或老年動物出現任何異常',
      },
      {
        heading: '責任限制',
        body: 'PupuPet 及其開發團隊不對因使用本應用程式的分析結果而導致的任何寵物健康損害或損失承擔法律責任。使用本服務即表示您理解並接受上述限制。',
      },
    ],
  },
};
