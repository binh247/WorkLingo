import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { AuthForm } from "./AuthForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const googleEnabled = !!(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
  );

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-12">
      <header className="text-center">
        <h1 className="text-3xl font-black text-brand">WorkLingo</h1>
        <p className="mt-1 font-bold text-ink-muted">
          Học tiếng Nhật từ công việc thật
        </p>
      </header>
      <div className="wl-card p-6">
        <AuthForm googleEnabled={googleEnabled} />
      </div>
    </main>
  );
}
