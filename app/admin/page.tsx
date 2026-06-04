import { requireAdmin } from "@/lib/session";
import { getGlobalStats } from "@/lib/repositories/admin";
import { listUsers } from "@/lib/repositories/users";
import { getAllAppSettings } from "@/lib/repositories/settings";
import { StatCard } from "@/components/StatCard";
import { AdminUsers } from "./AdminUsers";
import { AdminSettings } from "./AdminSettings";

export default async function AdminPage() {
  await requireAdmin();
  const [stats, users, settings] = await Promise.all([
    getGlobalStats(),
    listUsers({ limit: 100 }),
    getAllAppSettings(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-black text-ink">Quản trị</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon="👤" value={stats.totalUsers} label="Người dùng" />
        <StatCard icon="📄" value={stats.totalSources} label="Tài liệu" />
        <StatCard icon="🃏" value={stats.totalCards} label="Thẻ" />
        <StatCard icon="🤖" value={stats.aiThisMonth} label="AI tháng này" accent="text-info-dark" />
      </div>

      <AdminUsers users={users} />
      <AdminSettings settings={settings} />
    </main>
  );
}
