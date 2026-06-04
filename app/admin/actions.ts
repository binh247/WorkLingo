"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { setUserDisabled, setUserRole } from "@/lib/repositories/users";
import { upsertAppSetting } from "@/lib/repositories/settings";
import { invalidate, type ConfigKey } from "@/lib/config";
import type { SettingValue } from "@/lib/db/types";
import type { AppSetting } from "@/lib/db/schema";

export async function toggleUserDisabledAction(
  userId: string,
  disabled: boolean,
): Promise<void> {
  await requireAdmin();
  await setUserDisabled(userId, disabled);
  revalidatePath("/admin");
}

export async function setUserRoleAction(
  userId: string,
  role: "user" | "admin",
): Promise<void> {
  await requireAdmin();
  await setUserRole(userId, role);
  revalidatePath("/admin");
}

/** Sửa giá trị một app_setting (JSON string từ form) + invalidate cache config. */
export async function updateAppSettingAction(
  key: string,
  rawValue: string,
  type: AppSetting["type"],
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  let value: SettingValue;
  try {
    value =
      type === "string"
        ? rawValue
        : (JSON.parse(rawValue) as SettingValue);
  } catch {
    return { ok: false, error: "Giá trị JSON không hợp lệ" };
  }
  await upsertAppSetting(key, value, type, null, admin.id);
  invalidate(key as ConfigKey);
  revalidatePath("/admin");
  return { ok: true };
}
