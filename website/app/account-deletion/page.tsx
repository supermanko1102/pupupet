import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: '帳號刪除',
  description: 'PupuPet 口袋便便的帳號刪除流程、資料刪除與訂閱取消注意事項。',
};

export default function AccountDeletion() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-8">帳號刪除指南 (Account Deletion)</h1>
      
      <div className="space-y-6 text-gray-700 leading-relaxed">
        <p className="bg-amber-50 text-amber-800 p-4 rounded-lg border border-amber-200">
          <strong>請注意：</strong> 刪除帳號是永久性操作。一旦您刪除了您的帳號，所有的寵物資料、照片紀錄以及分析數據都會被立即且永久地從我們的伺服器中刪除，無法被復原。
        </p>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">如何在 App 內刪除帳號？</h2>
          <ol className="list-decimal pl-5 space-y-4">
            <li>在您的裝置上開啟「口袋便便 PupuPet」App。</li>
            <li>登入您想要刪除的帳號。</li>
            <li>點擊畫面右上角或底部的<strong>「設定 (Settings)」</strong>。</li>
            <li>向下滑動至頁面底部，找到並點擊<strong>「刪除帳號 (Delete Account)」</strong>按鈕。</li>
            <li>系統會要求您進行最後的確認，確認後您的帳號將被立即刪除。</li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">關於訂閱的特別提醒</h2>
          <p>
            如果您有正在進行中的付費訂閱項目（透過 Apple App Store），<strong>刪除 PupuPet 帳號並不會自動取消您的 App Store 訂閱扣款</strong>。
          </p>
          <p className="mt-2">
            您必須手動前往您的 iOS 裝置設定中取消訂閱：<br/>
            <code>設定 &gt; [您的姓名] &gt; 訂閱項目 &gt; 選擇 PupuPet 並取消訂閱。</code>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">資料保留與刪除細節</h2>
          <p>依據 Apple 的規範，我們承諾：在您執行刪除帳號的當下，您所有存放於我們資料庫 (Supabase) 的個人識別資料、上傳的圖片以及歷史分析紀錄，都會立刻被抹除，不會有任何延遲備份留存。</p>
        </section>
      </div>
    </main>
  );
}
