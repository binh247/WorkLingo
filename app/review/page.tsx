import { requireUser } from "@/lib/session";
import { getUserSettings } from "@/lib/repositories/settings";
import { getDueCards } from "@/lib/repositories/cards";
import { getNotePool } from "@/lib/repositories/notes";
import { ReviewClient } from "./ReviewClient";
import type { ReviewItem } from "@/components/ReviewCard";

export default async function ReviewPage() {
  const user = await requireUser();
  const [due, settings, pool] = await Promise.all([
    getDueCards(user.id, new Date(), 50),
    getUserSettings(user.id),
    getNotePool(user.id),
  ]);

  const items: ReviewItem[] = due.map(({ card, note, sentence }) => ({
    cardId: card.id,
    type: card.type,
    targetWord: note.targetWord,
    reading: note.reading,
    meaning: note.meaning,
    sentenceText: sentence.text,
  }));

  return (
    <ReviewClient
      items={items}
      pool={pool}
      soundEnabled={settings.soundEnabled}
    />
  );
}
