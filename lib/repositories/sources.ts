/**
 * Repository: sources + sentences. SKELETON Phase 1 — chữ ký đầy đủ, lọc userId.
 * Logic ghi đầy đủ hoàn thiện ở Phase 2 (Ingest/Import). docs/02-architecture §6.
 */
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sentences, sources } from "@/lib/db/schema";
import type { Sentence, Source } from "@/lib/db/schema";

export type NewSourceInput = {
  type: Source["type"];
  title: string;
  rawContent: string;
};

export async function listSources(userId: string): Promise<Source[]> {
  return db
    .select()
    .from(sources)
    .where(eq(sources.userId, userId))
    .orderBy(sources.createdAt);
}

export async function getSource(
  userId: string,
  id: string,
): Promise<Source | null> {
  const rows = await db
    .select()
    .from(sources)
    .where(and(eq(sources.userId, userId), eq(sources.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createSource(
  userId: string,
  input: NewSourceInput,
): Promise<Source> {
  const rows = await db
    .insert(sources)
    .values({ userId, ...input })
    .returning();
  return rows[0];
}

export async function getSentences(sourceId: string): Promise<Sentence[]> {
  return db.select().from(sentences).where(eq(sentences.sourceId, sourceId));
}

export async function insertSentences(
  sourceId: string,
  rows: Array<Omit<typeof sentences.$inferInsert, "sourceId">>,
): Promise<void> {
  if (rows.length === 0) return;
  await db.insert(sentences).values(rows.map((r) => ({ ...r, sourceId })));
}
