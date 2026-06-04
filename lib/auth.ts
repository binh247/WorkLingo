/**
 * Auth.js (NextAuth v5) + Drizzle adapter. Phase 5: auth thật.
 *  - Credentials: email + password (bcrypt so với users.password_hash).
 *  - Google OAuth: bật khi có AUTH_GOOGLE_ID/SECRET.
 *  - Chặn tài khoản disabled.
 * Session strategy = jwt (Credentials yêu cầu). role nhồi vào token/session.
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";
import { getUserByEmail, getUserById } from "@/lib/repositories/users";

const googleEnabled = !!(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
);

const providers = [
  Credentials({
    id: "credentials",
    name: "Email & mật khẩu",
    credentials: { email: {}, password: {} },
    async authorize(creds) {
      const email = String(creds?.email ?? "").trim().toLowerCase();
      const password = String(creds?.password ?? "");
      if (!email || !password) return null;
      const u = await getUserByEmail(email);
      if (!u || u.disabled || !u.passwordHash) return null;
      const ok = await bcrypt.compare(password, u.passwordHash);
      if (!ok) return null;
      return { id: u.id, email: u.email, name: u.name, role: u.role };
    },
  }),
  ...(googleEnabled ? [Google] : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async signIn({ user }) {
      // Chặn đăng nhập nếu tài khoản bị khoá.
      if (user?.id) {
        const u = await getUserById(user.id);
        if (u?.disabled) return false;
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) token.role = (user as { role?: string }).role ?? "user";
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
