import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: '隱私政策',
  description: 'PupuPet 口袋便便的隱私政策，說明資料收集、使用、儲存與刪除方式。',
};

export default function PrivacyPolicy() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-8">隱私權政策 (Privacy Policy)</h1>
      <p className="text-sm text-gray-500 mb-8">最後更新日期：2026年5月</p>

      <div className="space-y-6 text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. 簡介</h2>
          <p>歡迎使用「口袋便便 PupuPet」（以下簡稱「本應用程式」）。我們非常重視您的隱私權，本政策說明了我們如何收集、使用及保護您的個人資料。</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. 我們收集的資料</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>帳號資料</strong>：我們支援使用 Apple 登入 (Sign in with Apple)。我們僅收集 Apple 提供的必要標識符以建立和維護您的帳戶。</li>
            <li><strong>相機與照片資料</strong>：本應用程式提供寵物排泄物拍照與相簿讀取功能。您上傳的照片將透過人工智慧進行分析以提供健康參考，這些資料將儲存於我們安全的雲端資料庫（Supabase）中，僅供您的帳號存取與歷史追蹤使用。</li>
            <li><strong>使用數據</strong>：為了改善我們的服務，我們可能會收集匿名的應用程式使用數據與錯誤報告。</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. 資料的使用</h2>
          <p>我們收集的資料僅用於：</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>提供核心功能（如：AI 圖像分析、歷史紀錄追蹤）。</li>
            <li>管理您的帳戶與訂閱服務。</li>
            <li>改善並優化應用程式的演算法與使用者體驗。</li>
          </ul>
          <p className="mt-2 font-semibold">我們絕不會將您的個人資料與照片出售給第三方。</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. 資料儲存與安全</h2>
          <p>我們採用業界標準的安全加密技術與雲端基礎設施保護您的資料。但請注意，網際網路傳輸無法保證 100% 絕對安全。</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. 刪除您的資料</h2>
          <p>您有權隨時刪除您的帳戶及所有關聯資料。您可以直接在應用程式內的「設定」&gt;「刪除帳號」進行操作。操作完成後，您的所有照片與健康紀錄將從我們的伺服器中永久刪除且無法恢復。</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. 聯絡我們</h2>
          <p>如果您對本隱私權政策有任何疑問，請透過支援頁面聯絡我們。</p>
        </section>
      </div>
    </main>
  );
}
