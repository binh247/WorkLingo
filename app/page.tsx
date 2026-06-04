import { Button3D } from "@/components/Button3D";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <header className="text-center">
        <h1 className="text-4xl font-black text-brand">WorkLingo</h1>
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
          <Button3D variant="primary">Bắt đầu học</Button3D>
          <Button3D variant="info">Ôn tập</Button3D>
          <Button3D variant="xp">+10 XP</Button3D>
          <Button3D variant="danger">Again</Button3D>
          <Button3D variant="neutral" size="sm">
            Đã biết
          </Button3D>
        </div>

        <p className="text-sm font-bold text-ink-muted">
          Nền tảng Phase 1 — theme Duolingo, Drizzle + PostgreSQL tự host,
          app_settings + lib/config, các tầng lib skeleton đã sẵn sàng.
        </p>
      </Card>
    </main>
  );
}
