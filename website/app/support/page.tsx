import type { Metadata } from 'next';
import React from 'react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '支援',
  description: 'PupuPet 口袋便便的客服支援與聯絡資訊。',
};

export default function Support() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-12 text-center">
      <h1 className="text-3xl font-bold mb-6">支援與聯絡我們 (Support)</h1>
      
      <div className="bg-gray-50 rounded-2xl p-8 mb-8 border border-gray-100 shadow-sm">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">需要幫助嗎？</h2>
        <p className="text-gray-600 mb-6">
          如果您在使用「口袋便便 PupuPet」時遇到任何問題，例如訂閱問題、帳號問題或功能建議，歡迎隨時與我們聯絡！
        </p>
        
        <div className="inline-block bg-white px-6 py-3 rounded-lg border shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Email 支援信箱</p>
          <a href="mailto:support@pupupet.app" className="text-lg font-medium text-teal-600 hover:text-teal-700">
            support@pupupet.app
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
        <div className="p-6 border rounded-xl hover:shadow-md transition">
          <h3 className="font-semibold text-gray-900 mb-2">關於退款</h3>
          <p className="text-sm text-gray-600">由於訂閱是透過 Apple App Store 處理，如果您需要申請退款，請直接前往 Apple 的「回報問題」頁面申請。</p>
        </div>
        <div className="p-6 border rounded-xl hover:shadow-md transition">
          <h3 className="font-semibold text-gray-900 mb-2">帳號刪除</h3>
          <p className="text-sm text-gray-600">您可以直接在 App 的設定頁面中永久刪除您的帳號與所有資料。詳細說明請見<Link href="/account-deletion" className="text-teal-600 underline ml-1">帳號刪除指南</Link>。</p>
        </div>
      </div>
    </main>
  );
}
