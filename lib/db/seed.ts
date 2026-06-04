/**
 * Seed app_settings — idempotent (onConflictDoNothing).
 * Nguồn key/value DUY NHẤT: APP_SETTINGS_DEFAULTS trong lib/config.
 * Chạy: npm run db:seed
 */
import "dotenv/config";
import { db } from "./index";
import { appSettings } from "./schema";
import { APP_SETTINGS_DEFAULTS } from "../config";

async function main() {
  const rows = Object.entries(APP_SETTINGS_DEFAULTS).map(
    ([key, { value, type, description }]) => ({
      key,
      value,
      type,
      description,
    }),
  );

  const inserted = await db
    .insert(appSettings)
    .values(rows)
    .onConflictDoNothing()
    .returning({ key: appSettings.key });

  console.log(
    `Seed app_settings: ${inserted.length}/${rows.length} key mới chèn (đã có thì bỏ qua).`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed lỗi:", err);
  process.exit(1);
});
