import { ForgotForm } from "./ForgotForm";

export default function ForgotPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-12">
      <header className="text-center">
        <h1 className="text-2xl font-black text-ink">Quên mật khẩu</h1>
        <p className="mt-1 font-bold text-ink-muted">
          Nhập email để nhận liên kết đặt lại.
        </p>
      </header>
      <div className="wl-card p-6">
        <ForgotForm />
      </div>
    </main>
  );
}
