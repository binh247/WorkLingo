/**
 * Repository: app_settings (toàn cục) + user_settings (theo user).
 * Tầng trung gian chống lock-in — UI/feature không chạm Drizzle trực tiếp.
 * Hàm liên quan user LUÔN lọc where userId (docs/02-architecture §6).
 */
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appSettings, userSettings } from "@/lib/db/schema";
import type { AppSetting, UserSettingsRow } from "@/lib/db/schema";
import type { SettingValue } from "@/lib/db/types";

/* ----------------------------- app_settings ----------------------------- */
export async function getAllAppSettings(): Promise<AppSetting[]> {
  return db.select().from(appSettings);
}

export async function getAppSetting(key: string): Promise<AppSetting | null> {
  const rows = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .limit(1);
  return rows[0] ?? null;
}

/** Upsert một setting (dùng ở trang Admin — Sprint 5). */
export async function upsertAppSetting(
  key: string,
  value: SettingValue,
  type: AppSetting["type"],
  description: string | null,
  updatedBy: string | null,
): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key, value, type, description, updatedBy, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, type, description, updatedBy, updatedAt: new Date() },
    });
}

/* ----------------------------- user_settings ----------------------------- */
export async function getUserSettings(
  userId: string,
): Promise<UserSettingsRow | null> {
  const rows = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

/** Upsert tuỳ chỉnh của user (loại thẻ bật/tắt, âm thanh, JLPT) — Sprint 3/5. */
export async function upsertUserSettings(
  userId: string,
  patch: Partial<Omit<UserSettingsRow, "userId">>,
): Promise<void> {
  await db
    .insert(userSettings)
    .values({ userId, ...patch })
    .onConflictDoUpdate({ target: userSettings.userId, set: patch });
}
