/**
 * Auth.js (NextAuth v5) + Drizzle adapter — user/session trong Postgres của ta.
 * Phase 2 (QĐ-9): thêm provider Credentials CHỈ-DEV để nghiệm thu P2-P4.
 *   - Bật khi NODE_ENV !== 'production' && AUTH_DEV_LOGIN === 'true' (mặc định tắt).
 *   - Phase 5 thay bằng Email magic-link + Google OAuth.
 * Credentials yêu cầu session strategy 'jwt' → dùng jwt (tương thích Google/Email).
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";

const DEV_LOGIN_ENABLED =
  process.env.NODE_ENV !== "production" &&
  process.env.AUTH_DEV_LOGIN === "true";

export const DEV_USER_EMAIL = "dev@worklingo.local";

const devProviders = DEV_LOGIN_ENABLED
  ? [
      Credentials({
        id: "credentials",
        name: "Dev Login",
        credentials: {},
        async authorize() {
          // Không cần mật khẩu — đăng nhập đúng user test đã seed.
          const rows = await db
            .select()
            .from(users)
            .where(eq(users.email, DEV_USER_EMAIL))
            .limit(1);
          const u = rows[0];
          if (!u) return null;
          return { id: u.id, email: u.email, name: u.name, role: u.role };
        },
      }),
    ]
  : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [...devProviders],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? "user";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        (session.user as typeof session.user & { role?: string }).role =
          (token as { role?: string }).role ?? "user";
      }
      return session;
    },
  },
});
