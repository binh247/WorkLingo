import { requireUser } from "@/lib/session";
import { ImportForm } from "./ImportForm";

export default async function ImportPage() {
  await requireUser(); // chưa đăng nhập → redirect /login

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-black text-ink">Thêm tài liệu</h1>
        <p className="mt-1 font-bold text-ink-muted">
          Dán nội dung tiếng Nhật (chat, biên bản họp, transcript video) để phân
          tích thành câu + từ vựng.
        </p>
      </header>
      <ImportForm />
    </main>
  );
}
