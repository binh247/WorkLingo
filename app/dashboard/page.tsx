import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getConfig } from "@/lib/config";
import { getDashboard } from "@/lib/repositories/stats";
import { listSources } from "@/lib/repositories/sources";
import { Button3D } from "@/components/Button3D";
import { StatCard } from "@/components/StatCard";
import { SourceList } from "@/components/SourceList";

export default async function DashboardPage() {
  const user = await requireUser();
  const tz = await getConfig<string>("app_timezone");
  const [stats, sources] = await Promise.all([
    getDashboard(user.id, tz),
    listSources(user.id),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-ink">Tiến độ</h1>
        <Link href="/settings">
          <Button3D variant="neutral" size="sm">
            Cài đặt
          </Button3D>
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon="🔥" value={stats.streak} label="Ngày streak" accent="text-danger" />
        <StatCard icon="⭐" value={stats.xp} label="Tổng XP" accent="text-xp" />
        <StatCard icon="📅" value={stats.dueToday} label="Thẻ đến hạn" accent="text-info-dark" />
        <StatCard icon="🃏" value={stats.totalCards} label="Tổng thẻ" />
      </div>

      <Link href="/review">
        <Button3D variant="primary" className="w-full">
          {stats.dueToday > 0
            ? `Bắt đầu ôn (${stats.dueToday} thẻ)`
            : "Ôn tập"}
        </Button3D>
      </Link>

      <SourceList sources={sources} />
    </main>
  );
}
