import { requireUser } from "@/lib/session";
import { getUserSettings } from "@/lib/repositories/settings";
import { countCardsByType, type CardType } from "@/lib/repositories/cards";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const user = await requireUser();
  const settings = await getUserSettings(user.id);
  const counts = await countCardsByType(user.id);

  const cardCounts: Record<string, number> = {};
  (["recognition", "cloze", "production", "reading"] as CardType[]).forEach(
    (t) => {
      cardCounts[t] = counts.get(t) ?? 0;
    },
  );

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-6">
      <header className="mb-6 flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-black leading-tight text-ink">Cài đặt</h1>
          <p className="font-bold text-ink-muted">
            Tùy chỉnh cách Bloóm tạo và ôn thẻ cho bạn
          </p>
        </div>
        <span className="text-4xl">⚙️</span>
      </header>
      <SettingsClient
        enabledCardTypes={settings.enabledCardTypes}
        soundEnabled={settings.soundEnabled}
        cardCounts={cardCounts}
        email={user.email ?? ""}
      />
    </main>
  );
}
