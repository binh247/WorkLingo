import Link from "next/link";
import { Card } from "@/components/Card";
import { Button3D } from "@/components/Button3D";
import type { Source } from "@/lib/db/schema";

const TYPE_LABEL: Record<string, string> = {
  chat: "Chat",
  meeting: "Họp",
  youtube: "Video",
  text: "Văn bản",
};

export function SourceList({ sources }: { sources: Source[] }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-ink">Tài liệu của bạn</h2>
          <p className="text-xs font-bold text-ink-muted">
            Bấm vào tài liệu để học &amp; tạo thẻ flashcard.
          </p>
        </div>
        <Link href="/import">
          <Button3D variant="primary" size="sm">
            + Thêm
          </Button3D>
        </Link>
      </div>

      {sources.length === 0 ? (
        <Card className="text-center text-ink-muted">
          <p className="font-bold">Chưa có tài liệu nào.</p>
          <Link href="/import" className="font-bold text-brand-dark underline">
            Thêm tài liệu đầu tien →
          </Link>
        </Card>
      ) : (
        sources.map((s) => (
          <Link key={s.id} href={`/study?source=${s.id}`}>
            <Card className="flex items-center justify-between transition-colors hover:border-brand">
              <div>
                <div className="font-extrabold text-ink">{s.title}</div>
                <div className="text-xs font-bold text-ink-muted">
                  {new Date(s.createdAt).toLocaleDateString("vi-VN")}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="wl-badge bg-info/15 text-info-dark">
                  {TYPE_LABEL[s.type] ?? s.type}
                </span>
                <span className="text-sm font-extrabold text-brand-dark">
                  Học →
                </span>
              </div>
            </Card>
          </Link>
        ))
      )}
    </section>
  );
}
