import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "PupuPet 口袋便便",
    template: "%s | PupuPet 口袋便便",
  },
  description: "PupuPet 口袋便便的官方支援、隱私政策、服務條款與帳號刪除說明。",
};

const navItems = [
  { href: "/privacy", label: "隱私政策" },
  { href: "/terms", label: "服務條款" },
  { href: "/support", label: "支援" },
  { href: "/account-deletion", label: "帳號刪除" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-Hant"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#fbfaf7] text-[#1f2d2b]">
        <header className="border-b border-[#dce7e3] bg-white/90">
          <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/pupupet-icon.png"
                alt="PupuPet app icon"
                width={42}
                height={42}
                className="rounded-lg"
                priority
              />
              <div>
                <p className="text-base font-bold leading-5">PupuPet</p>
                <p className="text-sm text-[#5d6d68]">口袋便便</p>
              </div>
            </Link>

            <nav aria-label="主要導覽" className="flex flex-wrap gap-2 text-sm font-medium text-[#42514d]">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-2 transition hover:bg-[#e8f6f2] hover:text-[#087c75]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <footer className="border-t border-[#dce7e3] bg-white">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-6 text-sm text-[#5d6d68] sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 PupuPet 口袋便便</p>
            <div className="flex flex-wrap gap-4">
              <Link href="/privacy" className="hover:text-[#087c75]">隱私政策</Link>
              <Link href="/terms" className="hover:text-[#087c75]">服務條款</Link>
              <Link href="/support" className="hover:text-[#087c75]">聯絡支援</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
