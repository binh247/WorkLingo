/**
 * Auth.js (NextAuth v5) + Drizzle adapter — user/session lưu trong Postgres của ta.
 * Phase 1: KHUNG (providers rỗng). Email + Google bật ở Phase 5 (QĐ-9).
 */
import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  // Self-host (không Vercel) → phải tin host để Auth.js không chặn (UntrustedHost).
  trustHost: true,
  session: { strategy: "database" },
  // Email (magic link) + Google OAuth thêm ở Phase 5.
  providers: [],
  callbacks: {
    session({ session, user }) {
      // Gắn role vào session để phân quyền trang Admin (Phase 5).
      if (session.user && user) {
        (session.user as typeof session.user & { role?: string }).role = (
          user as { role?: string }
        ).role;
      }
      return session;
    },
  },
});
