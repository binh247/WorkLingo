import type { Metadata } from "next";
import { Nunito, Noto_Sans_JP } from "next/font/google";
import "./globals.css";

// Font chữ ký Duolingo: Nunito (tròn, đậm, thân thiện)
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "700", "800", "900"],
});

// Noto Sans JP cho kanji/kana (furigana)
const notoJP = Noto_Sans_JP({
  variable: "--font-jp",
  subsets: ["latin"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: "WorkLingo — Học tiếng Nhật từ công việc thật",
  description:
    "Học tiếng Nhật từ chính nội dung công việc của bạn: chat, transcript họp, video — immersion + sentence mining + SRS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${nunito.variable} ${notoJP.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
