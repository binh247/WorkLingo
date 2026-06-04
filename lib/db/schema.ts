/**
 * Drizzle schema — PostgreSQL tự host (không Supabase).
 * Bám docs/03-data-model.md. Bảng auth theo chuẩn @auth/drizzle-adapter.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { FsrsState, SettingValue, Token } from "./types";

/* ----------------------------- Enums ----------------------------- */
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const sourceTypeEnum = pgEnum("source_type", [
  "chat",
  "meeting",
  "youtube",
  "text",
]);
export const confidenceEnum = pgEnum("confidence", ["high", "medium", "low"]);
export const cardTypeEnum = pgEnum("card_type", [
  "recognition",
  "cloze",
  "production",
  "reading",
]);
export const wordStatusEnum = pgEnum("word_status", [
  "new",
  "learning",
  "known",
]);
export const settingTypeEnum = pgEnum("setting_type", [
  "string",
  "number",
  "bool",
  "json",
]);

/* ------------------------ Auth.js (Drizzle adapter) ------------------------ */
export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  // Mở rộng WorkLingo:
  role: roleEnum("role").notNull().default("user"),
  passwordHash: text("password_hash"),
  disabled: boolean("disabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

/* ----------------------------- Nội dung ----------------------------- */
export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: sourceTypeEnum("type").notNull(),
  title: text("title").notNull(),
  rawContent: text("raw_content").notNull(),
  audioUrl: text("audio_url"), // GĐ2
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sentences = pgTable(
  "sentences",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    original: text("original").notNull(),
    text: text("text").notNull(),
    corrected: boolean("corrected").notNull().default(false),
    note: text("note"),
    confidence: confidenceEnum("confidence").notNull().default("high"),
    tokens: jsonb("tokens").$type<Token[]>().notNull().default([]),
    skipped: boolean("skipped").notNull().default(false),
    translation: text("translation"),
    audioStart: real("audio_start"), // GĐ2
  },
  (t) => [index("sentences_source_id_idx").on(t.sourceId)],
);

/* ----------------------------- SRS ----------------------------- */
export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sentenceId: uuid("sentence_id")
      .notNull()
      .references(() => sentences.id, { onDelete: "cascade" }),
    targetWord: text("target_word").notNull(),
    reading: text("reading").notNull(),
    meaning: text("meaning").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("notes_sentence_id_idx").on(t.sentenceId)],
);

export const cards = pgTable(
  "cards",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    noteId: uuid("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: cardTypeEnum("type").notNull(),
    // fsrs_state: trạng thái FSRS (due, stability, difficulty...) — Sprint 4.
    fsrsState: jsonb("fsrs_state").$type<FsrsState>(),
    suspended: boolean("suspended").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("cards_note_id_idx").on(t.noteId),
    // Lấy thẻ đến hạn nhanh: where user_id + suspended, sắp theo due (jsonb).
    index("cards_due_idx").on(
      t.userId,
      t.suspended,
      sql`(${t.fsrsState} ->> 'due')`,
    ),
  ],
);

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  cardId: uuid("card_id")
    .notNull()
    .references(() => cards.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1=Again 2=Hard 3=Good 4=Easy
  reviewedAt: timestamp("reviewed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ----------------------------- User-scoped ----------------------------- */
export const userWords = pgTable(
  "user_words",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    word: text("word").notNull(), // lemma
    status: wordStatusEnum("status").notNull().default("new"),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.word] }),
    index("user_words_user_word_idx").on(t.userId, t.word),
  ],
);

export const userStats = pgTable("user_stats", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  xp: integer("xp").notNull().default(0),
  streak: integer("streak").notNull().default(0),
  lastStudiedDate: date("last_studied_date"),
});

export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  enabledCardTypes: jsonb("enabled_card_types")
    .$type<string[]>()
    .notNull()
    .default(["recognition"]),
  soundEnabled: boolean("sound_enabled").notNull().default(true),
  jlptLevel: text("jlpt_level"),
});

/* --------------------- Cấu hình hệ thống toàn cục --------------------- */
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<SettingValue>().notNull(),
  type: settingTypeEnum("type").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "set null",
  }),
});

/* ----------------------------- Suy luận type ----------------------------- */
export type AppSetting = typeof appSettings.$inferSelect;
export type UserSettingsRow = typeof userSettings.$inferSelect;
export type Source = typeof sources.$inferSelect;
export type Sentence = typeof sentences.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Card = typeof cards.$inferSelect;
export type UserStatsRow = typeof userStats.$inferSelect;
