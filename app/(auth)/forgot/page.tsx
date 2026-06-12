import Link from "next/link";
import { ForgotForm } from "./ForgotForm";

export default function ForgotPage() {
  return (
    <main className="flex min-h-screen w-full flex-1 items-center justify-center bg-[#F7F7F7] px-4 py-10">
      <div className="bounce-in w-full max-w-md">
        <header className="mb-6 text-center">
          <div className="mb-2 text-6xl">🔑</div>
          <h1 className="text-3xl font-black text-ink">Quên mật khẩu</h1>
          <p className="mt-2 font-bold text-ink-muted">
            Nhập email, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.
          </p>
        </header>
        <div className="wl-card p-6 sm:p-8">
          <ForgotForm />
        </div>
        <p className="mt-6 text-center">
          <Link href="/login" className="font-extrabold text-info">
            ← Quay lại đăng nhập
          </Link>
        </p>
      </div>
    </main>
  );
}
