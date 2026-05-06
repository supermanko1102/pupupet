import Image from "next/image";
import Link from "next/link";

const quickLinks = [
  {
    href: "/privacy",
    title: "隱私政策",
    body: "了解我們收集哪些資料、如何使用資料，以及如何刪除資料。",
  },
  {
    href: "/terms",
    title: "服務條款",
    body: "查看 PupuPet 的使用條款、訂閱說明與醫療免責聲明。",
  },
  {
    href: "/support",
    title: "支援與聯絡",
    body: "遇到帳號、訂閱或功能問題時，可以在這裡找到聯絡方式。",
  },
  {
    href: "/account-deletion",
    title: "帳號刪除",
    body: "查看如何刪除 PupuPet 帳號，以及訂閱取消的注意事項。",
  },
];

export default function Home() {
  return (
    <main>
      <section className="border-b border-[#dce7e3] bg-[#eef8f4]">
        <div className="mx-auto grid max-w-5xl gap-10 px-5 py-14 md:grid-cols-[1.1fr_0.9fr] md:items-center md:py-20">
          <div>
            <p className="mb-4 text-sm font-bold text-[#087c75]">
              Official Support
            </p>
            <h1 className="max-w-2xl text-4xl font-bold leading-tight text-[#1f2d2b] sm:text-5xl">
              PupuPet 口袋便便
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#42514d]">
              協助飼主記錄寵物排便狀況、使用 AI 影像分析追蹤健康變化。這裡提供 App Store 審核與使用者需要的政策、支援和帳號管理資訊。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/privacy"
                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#20b2aa] px-5 text-base font-bold text-white transition hover:bg-[#16948d]"
              >
                查看隱私政策
              </Link>
              <Link
                href="/support"
                className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#b8cfca] bg-white px-5 text-base font-bold text-[#1f2d2b] transition hover:border-[#20b2aa] hover:text-[#087c75]"
              >
                聯絡支援
              </Link>
            </div>
          </div>

          <div className="flex justify-center md:justify-end">
            <div className="w-full max-w-sm rounded-lg border border-[#d2e4df] bg-white p-6 shadow-sm">
              <Image
                src="/pupupet-icon.png"
                alt="PupuPet app icon"
                width={96}
                height={96}
                className="rounded-2xl"
                priority
              />
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between border-b border-[#edf2ef] pb-3">
                  <span className="text-sm text-[#5d6d68]">App 名稱</span>
                  <span className="font-bold">口袋便便</span>
                </div>
                <div className="flex items-center justify-between border-b border-[#edf2ef] pb-3">
                  <span className="text-sm text-[#5d6d68]">登入方式</span>
                  <span className="font-bold">Sign in with Apple</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#5d6d68]">支援信箱</span>
                  <a href="mailto:support@pupupet.app" className="font-bold text-[#087c75]">
                    support@pupupet.app
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#1f2d2b]">快速連結</h2>
          <p className="mt-2 text-[#5d6d68]">審核與使用者支援常用頁面。</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-[#dce7e3] bg-white p-5 shadow-sm transition hover:border-[#20b2aa] hover:shadow-md"
            >
              <h3 className="text-lg font-bold text-[#1f2d2b]">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#5d6d68]">{item.body}</p>
              <p className="mt-4 text-sm font-bold text-[#087c75]">前往頁面</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
