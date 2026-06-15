"use client";

import * as React from "react";
import Link from "next/link";
import { Button3D } from "@/components/Button3D";
import { cn } from "@/lib/utils";
import { deleteSourceAction } from "./actions";

type LibSource = {
  id: string;
  title: string;
  type: string;
  sentenceCount: number;
  cardCount: number;
};

const TYPE_META: Record<
  string,
  { label: string; icon: string; chipColor: string; iconBg: string }
> = {
  meeting: {
    label: "Họp",
    icon: "💼",
    chipColor: "Họp",
    iconBg: "bg-brand/10 border-brand/30",
  },
  chat: {
    label: "Chat",
    icon: "💬",
    chipColor: "Chat",
    iconBg: "bg-info/10 border-info/30",
  },
  youtube: {
    label: "Video",
    icon: "🎬",
    chipColor: "Video",
    iconBg: "bg-danger/10 border-danger/30",
  },
  text: {
    label: "Văn bản",
    icon: "📝",
    chipColor: "Văn bản",
    iconBg: "bg-xp/15 border-xp/40",
  },
};

const FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "meeting", label: "💼 Họp" },
  { key: "chat", label: "💬 Chat" },
  { key: "youtube", label: "🎬 Video" },
  { key: "text", label: "📝 Văn bản" },
];

export function LibraryClient({ sources }: { sources: LibSource[] }) {
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState("all");
  const [items, setItems] = React.useState<LibSource[]>(sources);
  const [pending, startTransition] = React.useTransition();

  function onDelete(s: LibSource) {
    const msg =
      s.cardCount > 0
        ? `Xóa tài liệu "${s.title}"? ${s.sentenceCount} câu và ${s.cardCount} thẻ đã đào sẽ bị xóa. Không khôi phục được.`
        : `Xóa tài liệu "${s.title}"? Không khôi phục được.`;
    if (!window.confirm(msg)) return;
    setItems((prev) => prev.filter((x) => x.id !== s.id));
    startTransition(async () => {
      await deleteSourceAction(s.id);
    });
  }

  const q = query.trim().toLowerCase();
  const visible = items.filter((s) => {
    const matchType = filter === "all" || s.type === filter;
    const matchText = q === "" || s.title.toLowerCase().includes(q);
    return matchType && matchText;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-ink sm:text-3xl">
            📚 Thư viện
          </h1>
          <p className="mt-1 text-sm font-bold text-ink-muted">
            Tài liệu của bạn — học từ ngữ cảnh thật
          </p>
        </div>
        <Link href="/import">
          <Button3D variant="primary" className="whitespace-nowrap">
            ➕ Thêm tài liệu
          </Button3D>
        </Link>
      </div>

      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-ink-muted">
          🔍
        </span>
        <input
          className="wl-input pl-11"
          placeholder="Tìm tài liệu..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full border-2 px-4 py-2 text-sm font-extrabold transition-colors",
              filter === f.key
                ? "border-info-dark bg-info text-white"
                : "border-[#E5E7EB] bg-white text-ink-muted",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mb-3 text-5xl">{items.length === 0 ? "📭" : "🔍"}</div>
          <p className="font-extrabold text-ink">
            {items.length === 0
              ? "Chưa có tài liệu nào"
              : "Không tìm thấy tài liệu nào"}
          </p>
          <p className="mt-1 text-sm font-bold text-ink-muted">
            {items.length === 0 ? (
              <Link href="/import" className="text-brand-dark underline">
                Thêm tài liệu đầu tiên →
              </Link>
            ) : (
              "Thử từ khóa khác hoặc đổi bộ lọc nhé!"
            )}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map((s) => {
            const meta = TYPE_META[s.type] ?? {
              label: s.type,
              icon: "📄",
              iconBg: "bg-[#F2F2F2] border-[#E5E5E5]",
            };
            return (
              <div
                key={s.id}
                className="wl-card p-4 transition-shadow hover:shadow-md sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 text-2xl",
                      meta.iconBg,
                    )}
                  >
                    {meta.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-extrabold text-ink sm:text-lg">
                      {s.title}
                    </h3>
                    <p className="mt-0.5 text-xs font-bold text-ink-muted sm:text-sm">
                      {meta.label} · {s.sentenceCount} câu · đã đào{" "}
                      {s.cardCount} thẻ
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onDelete(s)}
                      disabled={pending}
                      title="Xóa tài liệu"
                      aria-label="Xóa tài liệu"
                      className="flex h-10 w-10 items-center justify-center rounded-2xl border-2 border-danger-dark bg-danger text-lg leading-none text-white transition-colors hover:bg-danger-dark disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      🗑
                    </button>
                    <Link
                      href={`/study?source=${s.id}`}
                      title="Học tài liệu này"
                      className="flex h-10 w-10 items-center justify-center rounded-2xl border-2 border-brand-dark bg-brand text-xl font-extrabold leading-none text-white transition-colors hover:bg-brand-dark"
                    >
                      ›
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
