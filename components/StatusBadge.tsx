import { cn } from "@/lib/utils";
import { titleCase } from "@/lib/format";

const STYLES: Record<string, string> = {
  // contacts
  client: "bg-success/10 text-success border-success/30",
  lead: "bg-info/10 text-info border-info/30",
  inactive: "bg-muted text-muted-foreground border-border",
  // leads
  new: "bg-info/10 text-info border-info/30",
  contacted: "bg-accent/15 text-accent-foreground border-accent/40",
  qualified: "bg-warning/15 text-foreground border-warning/40",
  proposal_sent: "bg-primary/10 text-primary border-primary/30",
  converted: "bg-success/10 text-success border-success/30",
  // deals
  discovery: "bg-info/10 text-info border-info/30",
  proposal: "bg-warning/15 text-foreground border-warning/40",
  negotiation: "bg-accent/15 text-accent-foreground border-accent/40",
  won: "bg-success/10 text-success border-success/30",
  lost: "bg-destructive/10 text-destructive border-destructive/30",
  // invoices
  draft: "bg-muted text-muted-foreground border-border",
  sent: "bg-warning/15 text-foreground border-warning/40",
  paid: "bg-success/10 text-success border-success/30",
  overdue: "bg-destructive/10 text-destructive border-destructive/30",
  // tasks
  pending: "bg-muted text-muted-foreground border-border",
  in_progress: "bg-info/10 text-info border-info/30",
  done: "bg-success/10 text-success border-success/30",
  // priorities
  high: "bg-destructive/10 text-destructive border-destructive/30",
  medium: "bg-warning/15 text-foreground border-warning/40",
  low: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  const style = STYLES[value] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        style,
        className,
      )}
    >
      {titleCase(value)}
    </span>
  );
}
