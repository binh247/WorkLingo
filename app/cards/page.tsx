import Link from "next/link";
import { requireUser } from "@/lib/session";
import { listCardsWithNote, type CardType } from "@/lib/repositories/cards";
import { Card } from "@/components/Card";
import { Button3D } from "@/components/Button3D";

const TYPE_LABEL: Record<CardType, string> = {
  recognition: "Nhận diện",
  cloze: "Điền khuyết",
  production: "Sản sinh",
  reading: "Đọc",
};

function dueLabel(due: string | null): { text: string; cls: string } {
  if (!due) return { text: "Mới", cls: "bg-info/15 text-info-dark" };
  const d = new Date(due);
  const now = new Date();
  if (d <= now) return { text: "Đến hạn", cls: "bg-danger/15 text-danger" };
  const days = Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
  return {
    text: days <= 1 ? "Mai" : `Còn ${days} ngày`,
    cls: "bg-[#F2F2F2] text-ink-muted",
  };
}

export default async function CardsPage() {
  const user = await requireUser();
  const cards = await listCardsWithNote(user.id);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-8">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-ink">Thẻ của tôi</h1>
          <p className="mt-1 font-bold text-ink-muted">
            {cards.length} thẻ đã lưu. Bấm “Ôn tập” để ôn thẻ đến hạn.
          </p>
        </div>
        {cards.length > 0 && (
          <Link href="/review">
            <Button3D variant="primary" size="sm">
              Ôn tập
            </Button3D>
          </Link>
        )}
      </header>

      {cards.length === 0 ? (
        <Card className="flex flex-col gap-2 text-center text-ink-muted">
          <p className="font-bold">Bạn chưa lưu thẻ nào.</p>
          <p className="text-sm font-bold">
            Thẻ được tạo khi bạn học một tài liệu: mở tài liệu → bấm vào từ → lưu
            thành thẻ.
          </p>
          <Link
            href="/import"
            className="font-bold text-brand-dark underline"
          >
            Thêm tài liệu để bắt đầu →
          </Link>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {cards.map((c) => {
            const due = dueLabel(c.due);
            return (
              <Card
                key={c.id}
                className={c.suspended ? "opacity-50" : undefined}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-jp text-lg font-extrabold text-ink">
                      {c.targetWord}
                      {c.reading && (
                        <span className="ml-2 text-sm font-bold text-ink-muted">
                          {c.reading}
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-ink-muted">{c.meaning}</div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="wl-badge bg-brand/15 text-brand-dark">
                      {TYPE_LABEL[c.type]}
                    </span>
                    <span className={`wl-badge ${due.cls}`}>
                      {c.suspended ? "Đã ẩn" : due.text}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
