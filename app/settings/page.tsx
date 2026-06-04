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
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-8">
      <header>
        <h1 className="text-2xl font-black text-ink">Cài đặt</h1>
        <p className="mt-1 font-bold text-ink-muted">
          Chọn loại thẻ tạo ra khi lưu từ, và bật/tắt âm thanh.
        </p>
      </header>
      <SettingsClient
        enabledCardTypes={settings.enabledCardTypes}
        soundEnabled={settings.soundEnabled}
        cardCounts={cardCounts}
      />
    </main>
  );
}
