import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { LoginButtons } from "./LoginButtons";

/**
 * Trang /login — Phase 2: DEV tối thiểu (QĐ-9), nút "Đăng nhập (dev)".
 * Phase 5 thay nội dung bằng Email magic-link + Google OAuth.
 */
export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/import");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-12">
      <header className="text-center">
        <h1 className="text-3xl font-black text-brand">WorkLingo</h1>
        <p className="mt-1 font-bold text-ink-muted">Đăng nhập để bắt đầu học</p>
      </header>
      <div className="wl-card flex flex-col gap-3 p-6">
        <LoginButtons />
        <p className="text-center text-xs font-bold text-ink-muted">
          Phase 2: đăng nhập dev tạm. Email + Google sẽ có ở Phase 5.
        </p>
      </div>
    </main>
  );
}
