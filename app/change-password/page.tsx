import { requireUser } from "@/lib/session";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  await requireUser();
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-black text-ink">Đổi mật khẩu</h1>
      <div className="wl-card p-6">
        <ChangePasswordForm />
      </div>
    </main>
  );
}
