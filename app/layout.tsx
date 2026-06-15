import type { Metadata } from "next";
import { Nunito, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { getCurrentUser } from "@/lib/session";
import { getStats } from "@/lib/repositories/stats";
import { AppShell } from "@/components/AppShell";

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
  title: "Bloóm — Học tiếng Nhật từ công việc thật",
  description:
    "Học tiếng Nhật từ chính nội dung công việc của bạn: chat, transcript họp, video — immersion + sentence mining + SRS.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const stats = user ? await getStats(user.id) : null;
  return (
    <html
      lang="vi"
      className={`${nunito.variable} ${notoJP.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppShell
          isLoggedIn={!!user}
          isAdmin={user?.role === "admin"}
          streak={stats?.streak ?? 0}
          xp={stats?.xp ?? 0}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
