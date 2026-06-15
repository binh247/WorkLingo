"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button3D } from "@/components/Button3D";
import { SentenceView } from "@/components/SentenceView";
import { cn } from "@/lib/utils";
import type { Sentence } from "@/lib/db/schema";
import {
  deleteSentenceAction,
  toggleSkipAction,
  updateSentenceTextAction,
} from "./actions";

export function ReviewList({
  sourceId,
  sentences,
}: {
  sourceId: string;
  sentences: Sentence[];
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  return (
    <div className="flex flex-col gap-3">
      {sentences.map((s) => (
        <SentenceRow key={s.id} sourceId={sourceId} sentence={s} />
      ))}

      <Button3D
        variant="primary"
        className="mt-2 w-full"
        disabled={pending}
        onClick={() =>
          startTransition(() => router.push(`/study?source=${sourceId}`))
        }
      >
        Xác nhận &amp; học
      </Button3D>
    </div>
  );
}

function SentenceRow({
  sourceId,
  sentence,
}: {
  sourceId: string;
  sentence: Sentence;
}) {
  const [text, setText] = React.useState(sentence.text);
  const [skipped, setSkipped] = React.useState(sentence.skipped);
  const [editing, setEditing] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const isLow = sentence.confidence === "low";

  function saveText() {
    setEditing(false);
    startTransition(() =>
      updateSentenceTextAction(sourceId, sentence.id, text),
    );
  }

  function toggleSkip() {
    const next = !skipped;
    setSkipped(next);
    startTransition(() => toggleSkipAction(sourceId, sentence.id, next));
  }

  function remove() {
    if (!window.confirm("Xóa hẳn câu này? Không khôi phục được.")) return;
    startTransition(() => deleteSentenceAction(sourceId, sentence.id));
  }

  return (
    <div
      className={cn(
        "wl-card flex flex-col gap-2 p-4 transition-opacity",
        isLow && "border-danger/60",
        skipped && "opacity-40",
      )}
    >
      <div className="flex items-center gap-2">
        {isLow && (
          <span className="wl-badge bg-danger/15 text-danger">đáng ngờ</span>
        )}
        {sentence.corrected && (
          <span className="wl-badge bg-info/15 text-info-dark">đã sửa</span>
        )}
      </div>

      {/* Câu hiển thị furigana từ tokens */}
      <SentenceView tokens={sentence.tokens} />

      {/* Đối chiếu gốc ↔ sửa nếu AI có chỉnh */}
      {sentence.corrected && (
        <div className="text-sm text-ink-muted">
          <span className="font-jp line-through">{sentence.original}</span>
          {sentence.note && (
            <span className="ml-2 font-bold">({sentence.note})</span>
          )}
        </div>
      )}

      {/* Ô sửa text */}
      {editing ? (
        <div className="flex gap-2">
          <input
            className="wl-input font-jp"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button3D variant="primary" size="sm" onClick={saveText}>
            Lưu
          </Button3D>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button3D
            variant="neutral"
            size="sm"
            onClick={() => setEditing(true)}
          >
            Sửa câu
          </Button3D>
          <Button3D
            variant={skipped ? "info" : "neutral"}
            size="sm"
            disabled={pending}
            onClick={toggleSkip}
          >
            {skipped ? "Khôi phục" : "Bỏ câu rác"}
          </Button3D>
          <Button3D
            variant="danger"
            size="sm"
            disabled={pending}
            onClick={remove}
          >
            🗑 Xóa
          </Button3D>
        </div>
      )}
    </div>
  );
}
