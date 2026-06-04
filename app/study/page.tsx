import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getConfig } from "@/lib/config";
import { getSourceForStudy } from "@/lib/repositories/study";
import { getKnownLemmas, getStatusMap } from "@/lib/repositories/userWords";
import { getLemmaFrequency } from "@/lib/repositories/wordFreq";
import { getEnabledCardTypes } from "@/lib/repositories/settings";
import { selectWorthLearning } from "@/lib/study/word-selection";
import { StudyClient } from "./StudyClient";

export default async function StudyPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const user = await requireUser();
  const { source } = await searchParams;
  if (!source) notFound();

  const data = await getSourceForStudy(user.id, source);
  if (!data) notFound();

  const [statusMap, knownLemmas, freq, limit, enabled] = await Promise.all([
    getStatusMap(user.id),
    getKnownLemmas(user.id),
    getLemmaFrequency(user.id),
    getConfig<number>("suggested_words_per_source"),
    getEnabledCardTypes(user.id),
  ]);

  const { suggestions, plusOneSentenceIds } = selectWorthLearning({
    sentences: data.sentences.map((s) => ({ id: s.id, tokens: s.tokens })),
    knownLemmas,
    freq,
    limit,
  });

  return (
    <StudyClient
      sourceTitle={data.source.title}
      sentences={data.sentences.map((s) => ({
        id: s.id,
        text: s.text,
        confidence: s.confidence,
        tokens: s.tokens,
      }))}
      suggestions={suggestions}
      plusOneIds={[...plusOneSentenceIds]}
      statusEntries={[...statusMap.entries()]}
      enabledCount={enabled.length}
    />
  );
}
