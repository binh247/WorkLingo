import { ResetForm } from "./ResetForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const { email, token } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-12">
      <header className="text-center">
        <h1 className="text-2xl font-black text-ink">Đặt lại mật khẩu</h1>
      </header>
      <div className="wl-card p-6">
        {email && token ? (
          <ResetForm email={email} token={token} />
        ) : (
          <p className="font-bold text-danger">Liên kết không hợp lệ.</p>
        )}
      </div>
    </main>
  );
}
