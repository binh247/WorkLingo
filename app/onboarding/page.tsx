import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getUserSettings } from "@/lib/repositories/settings";
import { OnboardingClient } from "./OnboardingClient";

export default async function OnboardingPage() {
  const user = await requireUser();
  const settings = await getUserSettings(user.id);
  // Chỉ onboarding 1 lần.
  if (settings.jlptLevel) redirect("/import");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-12">
      <header className="text-center">
        <h1 className="text-2xl font-black text-ink">Trình độ của bạn?</h1>
        <p className="mt-1 font-bold text-ink-muted">
          Giúp WorkLingo bỏ qua những từ bạn đã biết. Có thể bỏ qua nếu không
          chắc.
        </p>
      </header>
      <OnboardingClient />
    </main>
  );
}
