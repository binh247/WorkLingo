import { requireUser } from "@/lib/session";
import {
  getStats,
  leaderboard,
  reviewHeatmap,
} from "@/lib/repositories/stats";
import { levelFromXp } from "@/lib/gamification";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";

export default async function StatsPage() {
  const user = await requireUser();
  const [stats, heat, board] = await Promise.all([
    getStats(user.id),
    reviewHeatmap(user.id, 84),
    leaderboard(10),
  ]);
  const lvl = levelFromXp(stats.xp);
  const heatMap = new Map(heat.map((h) => [h.day, h.count]));

  // 84 ngày gần nhất (12 tuần) cho heatmap.
  const days: { day: string; count: number }[] = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    days.push({ day: d, count: heatMap.get(d) ?? 0 });
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-black text-ink">Thống kê</h1>

      <Card className="flex flex-col gap-2">
        <div className="flex items-center justify-between font-extrabold text-ink">
          <span>⭐ Level {lvl.level}</span>
          <span className="text-sm text-ink-muted">
            {lvl.xpIntoLevel}/{lvl.xpForNext} XP
          </span>
        </div>
        <ProgressBar value={(lvl.xpIntoLevel / lvl.xpForNext) * 100} />
      </Card>

      <Card>
        <h2 className="mb-2 font-extrabold text-ink">
          Lịch ôn (84 ngày) — 🔥 {stats.streak} ngày streak
        </h2>
        <div className="grid grid-flow-col grid-rows-7 gap-1">
          {days.map((d) => (
            <div
              key={d.day}
              title={`${d.day}: ${d.count} lượt`}
              className="h-3 w-3 rounded-sm"
              style={{
                backgroundColor:
                  d.count === 0
                    ? "#EEE"
                    : d.count < 3
                      ? "#A5E887"
                      : d.count < 8
                        ? "#58CC02"
                        : "#46A302",
              }}
            />
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 font-extrabold text-ink">🏆 Bảng xếp hạng XP</h2>
        <ol className="flex flex-col gap-1">
          {board.map((u, i) => (
            <li
              key={i}
              className="flex justify-between font-bold text-ink"
            >
              <span>
                {i + 1}. {u.name ?? "Ẩn danh"}
              </span>
              <span className="text-xp">{u.xp} XP</span>
            </li>
          ))}
        </ol>
      </Card>

      <a
        href="/api/export/anki"
        className="btn-3d btn-neutral self-start"
        download
      >
        ⬇️ Xuất thẻ sang Anki (TSV)
      </a>
    </main>
  );
}
