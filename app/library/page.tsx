import { requireUser } from "@/lib/session";
import { listSourcesWithStats } from "@/lib/repositories/sources";
import { LibraryClient } from "./LibraryClient";

export default async function LibraryPage() {
  const user = await requireUser();
  const sources = await listSourcesWithStats(user.id);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      <LibraryClient
        sources={sources.map((s) => ({
          id: s.id,
          title: s.title,
          type: s.type,
          sentenceCount: s.sentenceCount,
          cardCount: s.cardCount,
        }))}
      />
    </main>
  );
}
