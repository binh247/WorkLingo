import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getConfig } from "@/lib/config";
import { getDashboard, reviewHeatmap } from "@/lib/repositories/stats";
import { listSourcesWithStats } from "@/lib/repositories/sources";
import { getUserById } from "@/lib/repositories/users";

const TYPE_ICON: Record<string, string> = {
  meeting: "💼",
  chat: "💬",
  youtube: "🎬",
  text: "📝",
};
const TYPE_LABEL: Record<string, string> = {
  meeting: "Họp",
  chat: "Chat",
  youtube: "YouTube",
  text: "Văn bản",
};
const WEEKDAY = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const WEEKLY_GOAL = 7;

type WeekDay = { label: string; count: number; isToday: boolean };

/** 7 ngày gần nhất (cũ→mới) kèm số lượt ôn. Tách khỏi component để render thuần. */
function buildWeek(heatMap: Map<string, number>): WeekDay[] {
  const today = Date.now();
  const week: WeekDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    week.push({
      label: WEEKDAY[d.getDay()],
      count: heatMap.get(key) ?? 0,
      isToday: i === 0,
    });
  }
  return week;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const tz = await getConfig<string>("app_timezone");
  const [stats, heat, sources, row] = await Promise.all([
    getDashboard(user.id, tz),
    reviewHeatmap(user.id, 7),
    listSourcesWithStats(user.id),
    getUserById(user.id),
  ]);

  const name = row?.name?.trim() || user.email?.split("@")[0] || "bạn";
  const heatMap = new Map(heat.map((h) => [h.day, h.count]));

  // 7 ngày gần nhất cho biểu đồ + mục tiêu tuần.
  const week = buildWeek(heatMap);
  const maxCount = Math.max(1, ...week.map((w) => w.count));
  const studiedDays = week.filter((w) => w.count > 0).length;
  const goalPct = Math.min(100, (studiedDays / WEEKLY_GOAL) * 100);
  const recent = sources.slice(0, 4);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      {/* Lời chào */}
      <div className="bounce-in mb-6">
        <h1 className="text-3xl font-black text-ink">
          Xin chào, {name} <span className="inline-block">👋</span>
        </h1>
        <p className="mt-1 font-bold text-ink-muted">
          Sẵn sàng học tiếng Nhật hôm nay chưa?
        </p>
      </div>

      {/* 4 thẻ thống kê */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          icon="🔥"
          value={stats.streak}
          label="ngày Streak"
          border="border-orange-200"
          bg="bg-orange-50"
          color="text-orange-500"
        />
        <StatTile
          icon="⭐"
          value={stats.xp}
          label="điểm XP"
          border="border-yellow-200"
          bg="bg-yellow-50"
          color="text-xp"
        />
        <StatTile
          icon="🃏"
          value={stats.dueToday}
          label="đến hạn hôm nay"
          border="border-sky-200"
          bg="bg-sky-50"
          color="text-info"
        />
        <StatTile
          icon="📚"
          value={stats.totalCards}
          label="tổng số thẻ"
          border="border-green-200"
          bg="bg-green-50"
          color="text-brand"
        />
      </div>

      {/* CTA ôn tập */}
      <div className="mb-6 flex flex-col gap-4 rounded-3xl border-2 border-brand bg-green-50 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xl font-extrabold text-ink">
            {stats.dueToday > 0 ? (
              <>
                Bạn có <span className="text-brand">{stats.dueToday} thẻ</span>{" "}
                cần ôn hôm nay
              </>
            ) : (
              "Hôm nay không còn thẻ đến hạn 🎉"
            )}
          </div>
          <p className="mt-1 font-bold text-ink-muted">
            {stats.dueToday > 0
              ? `Ôn ngay để giữ lửa streak ${stats.streak} ngày của bạn! 🔥`
              : "Thêm tài liệu mới hoặc ôn lại để giữ streak nhé!"}
          </p>
        </div>
        <Link href="/review">
          <button className="btn-3d btn-primary whitespace-nowrap px-8 py-4 text-lg">
            ÔN TẬP NGAY 🔥
          </button>
        </Link>
      </div>

      {/* Mục tiêu tuần */}
      <div className="mb-6 rounded-3xl border-2 border-[#EEE] bg-white p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-ink">Mục tiêu tuần</h2>
          <span className="font-extrabold text-brand">
            {studiedDays}/{WEEKLY_GOAL} ngày
          </span>
        </div>
        <div className="h-5 w-full overflow-hidden rounded-full bg-[#F2F2F2]">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${goalPct}%` }}
          />
        </div>
        <p className="mt-2 text-sm font-bold text-ink-muted">
          {studiedDays >= WEEKLY_GOAL
            ? "Tuyệt vời, bạn đã đạt mục tiêu tuần này 💪"
            : `Còn ${WEEKLY_GOAL - studiedDays} ngày nữa để hoàn thành mục tiêu tuần này 💪`}
        </p>
      </div>

      {/* Biểu đồ hoạt động 7 ngày */}
      <div className="mb-6 rounded-3xl border-2 border-[#EEE] bg-white p-6">
        <h2 className="mb-4 text-lg font-extrabold text-ink">
          Hoạt động 7 ngày qua
        </h2>
        <div className="flex h-40 items-end justify-between gap-2">
          {week.map((w, i) => (
            <div
              key={i}
              className="flex h-full flex-1 flex-col items-center justify-end gap-2"
            >
              <div
                className={`w-full rounded-xl ${w.isToday ? "border-2 border-brand-dark bg-brand" : "bg-[#E5E5E5]"}`}
                style={{
                  height: `${Math.max(6, (w.count / maxCount) * 100)}%`,
                }}
                title={`${w.count} lượt`}
              />
              <span
                className={`text-xs font-bold ${w.isToday ? "text-brand" : "text-ink-muted"}`}
              >
                {w.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tài liệu gần đây */}
      <div className="rounded-3xl border-2 border-[#EEE] bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-ink">Tài liệu gần đây</h2>
          <Link
            href="/library"
            className="font-extrabold text-info hover:text-info-dark"
          >
            Xem tất cả ›
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-center font-bold text-ink-muted">
            Chưa có tài liệu.{" "}
            <Link href="/import" className="text-brand-dark underline">
              Thêm tài liệu →
            </Link>
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {recent.map((s) => (
              <Link
                key={s.id}
                href={`/study?source=${s.id}`}
                className="flex items-center gap-4 rounded-2xl border-2 border-[#F2F2F2] p-4 transition hover:border-info hover:bg-sky-50"
              >
                <div className="text-3xl">{TYPE_ICON[s.type] ?? "📄"}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-extrabold text-ink">
                    {s.title}
                  </div>
                  <div className="text-sm font-bold text-ink-muted">
                    {TYPE_LABEL[s.type] ?? s.type} · {s.sentenceCount} câu ·{" "}
                    {s.cardCount} thẻ
                  </div>
                </div>
                <span className="text-xl font-extrabold text-ink-muted">›</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function StatTile({
  icon,
  value,
  label,
  border,
  bg,
  color,
}: {
  icon: string;
  value: number;
  label: string;
  border: string;
  bg: string;
  color: string;
}) {
  return (
    <div
      className={`flex flex-col items-center rounded-2xl border-2 ${border} ${bg} p-4 text-center`}
    >
      <div className="text-3xl">{icon}</div>
      <div className={`mt-1 text-2xl font-extrabold ${color}`}>{value}</div>
      <div className="mt-0.5 text-xs font-bold text-ink-muted">{label}</div>
    </div>
  );
}
