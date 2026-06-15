import Image from "next/image";
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
    <main className="flex min-h-screen w-full flex-1 items-center justify-center bg-gradient-to-b from-[#E8F9DC] via-[#F7F7F7] to-[#E3F4FF] px-4 py-10">
      <div className="bounce-in w-full max-w-md">
        <div className="mb-8 text-center">
          <Image
            src="/logo.png"
            alt="Bloóm"
            width={130}
            height={143}
            priority
            className="mx-auto"
            style={{ filter: "drop-shadow(0 6px 0 rgba(0,0,0,0.08))" }}
          />
          <p className="mt-2 font-bold text-ink">
            Học tiếng Nhật từ chính công việc của bạn
          </p>
          <p className="font-jp mt-1 text-sm font-bold text-ink-muted">
            <ruby>
              仕事<rt>しごと</rt>
            </ruby>
            から
            <ruby>
              日本語<rt>にほんご</rt>
            </ruby>
            を
            <ruby>
              学<rt>まな</rt>
            </ruby>
            ぼう
          </p>
        </div>
        <div className="wl-card p-6 sm:p-8">
          <AuthForm googleEnabled={googleEnabled} />
        </div>
      </div>
    </main>
  );
}
