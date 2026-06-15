import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { Button3D } from "@/components/Button3D";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";

export default async function Home() {
  // Đã đăng nhập → vào thẳng dashboard (đừng hiện màn hình "Đăng nhập" nữa).
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <header className="text-center">
        <Image
          src="/logo.png"
          alt="Bloóm"
          width={104}
          height={115}
          priority
          className="mx-auto"
        />
        <p className="mt-1 font-bold text-ink">
          Học tiếng Nhật từ chính công việc thật của bạn
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
      </header>

      <Card className="flex flex-col gap-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-sm font-extrabold text-ink">
            <span>Tiến độ hôm nay</span>
            <span className="text-brand-dark">60%</span>
          </div>
          <ProgressBar value={60} />
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/import">
            <Button3D variant="primary">Thêm tài liệu</Button3D>
          </Link>
          <Link href="/review">
            <Button3D variant="info">Ôn tập</Button3D>
          </Link>
          <Link href="/login">
            <Button3D variant="neutral">Đăng nhập</Button3D>
          </Link>
        </div>

        <p className="text-sm font-bold text-ink-muted">
          Nền tảng Phase 1 — theme Duolingo, Drizzle + PostgreSQL tự host,
          app_settings + lib/config, các tầng lib skeleton đã sẵn sàng.
        </p>
      </Card>
    </main>
  );
}
