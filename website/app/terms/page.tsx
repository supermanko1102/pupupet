import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: '服務條款',
  description: 'PupuPet 口袋便便的服務條款、訂閱說明與醫療免責聲明。',
};

export default function TermsOfService() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-8">服務條款 (Terms of Service)</h1>
      <p className="text-sm text-gray-500 mb-8">最後更新日期：2026年5月</p>

      <div className="space-y-6 text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. 接受條款</h2>
          <p>當您下載、安裝或使用「口袋便便 PupuPet」（以下簡稱「本應用程式」）時，即表示您同意接受本服務條款的約束。如果您不同意這些條款，請勿使用本應用程式。</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. 醫療免責聲明 (Medical Disclaimer)</h2>
          <p className="font-semibold text-red-600 bg-red-50 p-4 rounded-lg">
            本應用程式提供的 AI 影像分析結果與健康建議僅供參考，絕對無法取代專業獸醫師的診斷與醫療建議。如果您的寵物出現任何不適或異常症狀，請務必立即尋求專業獸醫師的協助。我們對因依賴本應用程式資訊而導致的任何後果概不負責。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. 訂閱服務 (Subscriptions)</h2>
          <p>本應用程式可能包含付費訂閱服務（例如：無限次 AI 掃描、進階數據圖表）。</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>訂閱將透過您的 Apple ID 帳戶進行扣款。</li>
            <li>除非在目前訂閱期結束前至少 24 小時關閉自動續訂，否則您的訂閱將自動續期。</li>
            <li>您可以隨時在您的 Apple ID 帳戶設定中管理或取消您的訂閱。</li>
            <li>取消訂閱後，您仍可使用進階功能直到目前訂閱週期結束。</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. 使用者規範</h2>
          <p>您同意不將本應用程式用於任何非法用途，且承諾不進行逆向工程、破壞應用程式之安全性或上傳含有惡意軟體之內容。</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. 條款修改</h2>
          <p>我們保留隨時修改本服務條款的權利。重大變更將於應用程式內或官方網站上發布通知。</p>
        </section>
      </div>
    </main>
  );
}
