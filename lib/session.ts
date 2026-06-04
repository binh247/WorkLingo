/**
 * Helper lấy user hiện tại (server-side). Dùng ở Server Components / Route Handlers.
 */
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export type CurrentUser = { id: string; email?: string | null; role: string };

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const u = session?.user as
    | { id?: string; email?: string | null; role?: string }
    | undefined;
  if (!u?.id) return null;
  return { id: u.id, email: u.email, role: u.role ?? "user" };
}

/** Bắt buộc đăng nhập; chưa đăng nhập → redirect /login. */
export async function requireUser(): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return u;
}
