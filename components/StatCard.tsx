import { Card } from "@/components/Card";

export function StatCard({
  icon,
  value,
  label,
  accent,
}: {
  icon: string;
  value: React.ReactNode;
  label: string;
  accent?: string;
}) {
  return (
    <Card className="flex flex-col items-center gap-1 py-5 text-center">
      <span className="text-2xl">{icon}</span>
      <span className={`text-2xl font-black ${accent ?? "text-ink"}`}>
        {value}
      </span>
      <span className="text-xs font-bold text-ink-muted">{label}</span>
    </Card>
  );
}
