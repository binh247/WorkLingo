"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button3D } from "@/components/Button3D";
import { cn } from "@/lib/utils";

const SOURCE_TYPES = [
  { value: "meeting", label: "Họp" },
  { value: "chat", label: "Chat" },
  { value: "youtube", label: "Video" },
  { value: "text", label: "Văn bản" },
] as const;

export function ImportForm() {
  const router = useRouter();
  const [type, setType] = React.useState<string>("meeting");
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type && !file.type.startsWith("text/")) {
      setError("Chỉ nhận file .txt");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setContent(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  async function analyze() {
    setError(null);
    if (!content.trim()) {
      setError("Vui lòng nhập nội dung");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, title, rawContent: content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Phân tích thất bại");
        return;
      }
      router.push(`/import/${data.sourceId}/review`);
    } catch {
      setError("Lỗi mạng, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {SOURCE_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setType(t.value)}
            className={cn("wl-chip", type === t.value && "wl-chip-on")}
          >
            {t.label}
          </button>
        ))}
      </div>

      <input
        className="wl-input"
        placeholder="Tiêu đề (vd: Họp nhóm 6/2)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        className="wl-input min-h-48 resize-y"
        placeholder="Dán nội dung tiếng Nhật vào đây…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      <label className="text-sm font-bold text-ink-muted">
        …hoặc tải lên file .txt:{" "}
        <input
          type="file"
          accept="text/plain,.txt"
          onChange={onFile}
          className="font-normal"
        />
      </label>

      {error && (
        <p className="font-bold text-danger" role="alert">
          {error}
        </p>
      )}

      <Button3D
        variant="primary"
        className="w-full"
        disabled={loading}
        onClick={analyze}
      >
        {loading ? "Đang phân tích…" : "Phân tích"}
      </Button3D>
    </div>
  );
}
