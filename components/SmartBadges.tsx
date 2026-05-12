import { Flame, Snowflake, ThermometerSun, AlertTriangle, CheckCircle2, CircleSlash } from "lucide-react";
import type { DealHealth } from "@/lib/smart";

export function LeadScoreBadge({ score, tier }: { score: number; tier: "hot" | "warm" | "cold" }) {
  const cfg = {
    hot:  { cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", Icon: Flame,            label: "Hot" },
    warm: { cls: "bg-amber-500/15 text-amber-600 border-amber-500/30",       Icon: ThermometerSun,   label: "Warm" },
    cold: { cls: "bg-sky-500/15 text-sky-600 border-sky-500/30",             Icon: Snowflake,        label: "Cold" },
  }[tier];
  const Icon = cfg.Icon;
  return (
    <span
      title={`Smart lead score: ${score}/100`}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.cls}`}
    >
      <Icon className="h-3 w-3" /> {cfg.label} · {score}
    </span>
  );
}

export function DealHealthBadge({ health }: { health: DealHealth }) {
  const cfg = {
    on_track: { cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", Icon: CheckCircle2,   label: health.label },
    at_risk:  { cls: "bg-amber-500/15 text-amber-600 border-amber-500/30",       Icon: AlertTriangle,  label: "At Risk" },
    stalled:  { cls: "bg-rose-500/15 text-rose-600 border-rose-500/30",          Icon: CircleSlash,    label: "Stalled" },
  }[health.status];
  const Icon = cfg.Icon;
  return (
    <span
      title={`${health.daysInStage} day${health.daysInStage === 1 ? "" : "s"} since last activity`}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.cls}`}
    >
      <Icon className="h-3 w-3" /> {cfg.label}
    </span>
  );
}

export function PaymentTag({ label, tone }: { label: string; tone: "good" | "warn" | "bad" | "neutral" }) {
  const cls = {
    good:    "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    warn:    "bg-amber-500/15 text-amber-600 border-amber-500/30",
    bad:     "bg-rose-500/15 text-rose-600 border-rose-500/30",
    neutral: "bg-muted text-muted-foreground border-border",
  }[tone];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {label}
    </span>
  );
}
