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
import { getConfig } from "@/lib/config";

export type ResolvedUserSettings = {
  enabledCardTypes: string[];
  soundEnabled: boolean;
  jlptLevel: string | null;
};

export async function getUserSettingsRow(
  userId: string,
): Promise<UserSettingsRow | null> {
  const rows = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

/** Settings của user, fallback default (app_settings.default_card_types) nếu chưa có. */
export async function getUserSettings(
  userId: string,
): Promise<ResolvedUserSettings> {
  const row = await getUserSettingsRow(userId);
  if (row) {
    return {
      enabledCardTypes: row.enabledCardTypes,
      soundEnabled: row.soundEnabled,
      jlptLevel: row.jlptLevel,
    };
  }
  const def = await getConfig<string[]>("default_card_types");
  return { enabledCardTypes: def, soundEnabled: true, jlptLevel: null };
}

export async function getEnabledCardTypes(userId: string): Promise<string[]> {
  return (await getUserSettings(userId)).enabledCardTypes;
}

/** Upsert tuỳ chỉnh của user (loại thẻ bật/tắt, âm thanh). */
export async function updateUserSettings(
  userId: string,
  patch: { enabledCardTypes?: string[]; soundEnabled?: boolean },
): Promise<void> {
  await db
    .insert(userSettings)
    .values({ userId, ...patch })
    .onConflictDoUpdate({ target: userSettings.userId, set: patch });
}

export async function setJlptLevel(
  userId: string,
  level: string,
): Promise<void> {
  await db
    .insert(userSettings)
    .values({ userId, jlptLevel: level })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { jlptLevel: level },
    });
}
