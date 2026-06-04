import { requireUser } from "@/lib/session";
import { getUserSettings } from "@/lib/repositories/settings";
import { getDueCards } from "@/lib/repositories/cards";
import { ReviewClient } from "./ReviewClient";
import type { ReviewItem } from "@/components/ReviewCard";

export default async function ReviewPage() {
  const user = await requireUser();
  const due = await getDueCards(user.id, new Date(), 50);
  const settings = await getUserSettings(user.id);

  const items: ReviewItem[] = due.map(({ card, note, sentence }) => ({
    cardId: card.id,
    type: card.type,
    targetWord: note.targetWord,
    reading: note.reading,
    meaning: note.meaning,
    sentenceText: sentence.text,
  }));

  return <ReviewClient items={items} soundEnabled={settings.soundEnabled} />;
}
