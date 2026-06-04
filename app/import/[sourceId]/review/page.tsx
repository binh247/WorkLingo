import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getSourceWithSentences } from "@/lib/repositories/sources";
import { ReviewList } from "./ReviewList";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ sourceId: string }>;
}) {
  const user = await requireUser();
  const { sourceId } = await params;
  const data = await getSourceWithSentences(sourceId, user.id);
  if (!data) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-8">
      <header>
        <h1 className="text-2xl font-black text-ink">{data.source.title}</h1>
        <p className="mt-1 font-bold text-ink-muted">
          Duyệt &amp; sửa lại các câu trước khi học. Câu được đánh dấu{" "}
          <span className="text-danger">đáng ngờ</span> nên kiểm tra kỹ.
        </p>
      </header>
      <ReviewList sourceId={sourceId} sentences={data.sentences} />
    </main>
  );
}
