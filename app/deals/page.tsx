"use client";

import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatUSD, formatDate } from "@/lib/format";
import { dealHealth, type ActivityLike } from "@/lib/smart";
import { DealHealthBadge } from "@/components/SmartBadges";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent, useDroppable, useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

export default function DealsPageWrapper() {
  return (
    <RequireAuth>
      <DealsPage />
    </RequireAuth>
  );
}

type Stage = "discovery" | "proposal" | "negotiation" | "won" | "lost";
type Deal = {
  id: string; title: string; client_name: string; value: number;
  stage: Stage; due_date: string | null; assigned_to: string | null;
  created_at?: string;
};
type Member = { id: string; name: string };

const STAGES: { id: Stage; label: string }[] = [
  { id: "discovery", label: "Discovery" },
  { id: "proposal", label: "Proposal" },
  { id: "negotiation", label: "Negotiation" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
];

function DealsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const { data: deals = [] } = useQuery({
    queryKey: ["deals", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("deals").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((d: any) => ({ ...d, value: Number(d.value) })) as Deal[];
    },
  });
  const { data: members = [] } = useQuery({
    queryKey: ["team_members", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("team_members").select("id,name").order("name");
      return (data ?? []) as Member[];
    },
  });
  const { data: activities = [] } = useQuery({
    queryKey: ["activities", "deal", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("entity_id,entity_type,created_at,type")
        .eq("entity_type", "deal")
        .order("created_at", { ascending: false });
      return (data ?? []) as ActivityLike[];
    },
  });

  const grouped = useMemo(() => {
    const g: Record<Stage, Deal[]> = { discovery: [], proposal: [], negotiation: [], won: [], lost: [] };
    deals.forEach((d) => g[d.stage].push(d));
    return g;
  }, [deals]);

  const upsert = useMutation({
    mutationFn: async (d: Partial<Deal> & { id?: string }) => {
      if (d.id) {
        const { error } = await supabase.from("deals").update({
          title: d.title, client_name: d.client_name, value: d.value,
          stage: d.stage, due_date: d.due_date, assigned_to: d.assigned_to,
        }).eq("id", d.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("deals").insert({
          user_id: user!.id, title: d.title!, client_name: d.client_name!,
          value: d.value ?? 0, stage: d.stage ?? "discovery",
          due_date: d.due_date, assigned_to: d.assigned_to,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      setOpen(false); setEditing(null);
      toast.success("Deal saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["deals"] }); setOpen(false); setEditing(null); toast.success("Deleted"); },
  });

  const moveStage = useMutation({
    mutationFn: async ({ id, stage, prevStage }: { id: string; stage: Stage; prevStage: Stage }) => {
      const { error } = await supabase.from("deals").update({ stage }).eq("id", id);
      if (error) throw error;
      await supabase.from("activities").insert({
        user_id: user!.id, entity_type: "deal" as any, entity_id: id,
        type: "status_change", content: `Stage changed: ${prevStage} → ${stage}`,
      });
    },
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: ["deals"] });
      const prev = qc.getQueryData<Deal[]>(["deals", user?.id]);
      qc.setQueryData<Deal[]>(["deals", user?.id], (old) =>
        (old ?? []).map((d) => (d.id === id ? { ...d, stage } : d)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(["deals", user?.id], ctx.prev),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["activities", "deal"] });
    },
  });

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    if (!e.over) return;
    const dealId = String(e.active.id);
    const newStage = String(e.over.id) as Stage;
    const deal = deals.find((d) => d.id === dealId);
    if (deal && deal.stage !== newStage) moveStage.mutate({ id: dealId, stage: newStage, prevStage: deal.stage });
  };

  const activeDeal = activeId ? deals.find((d) => d.id === activeId) : null;

  return (
    <AppShell title={t("pages.deals.title")}>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <p className="text-muted-foreground">Drag cards between stages to update.</p>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New Deal</Button></DialogTrigger>
          <DealDialog
            initial={editing} members={members}
            onSubmit={(d) => upsert.mutate({ ...d, id: editing?.id })}
            onDelete={editing ? () => remove.mutate(editing.id) : undefined}
            busy={upsert.isPending}
          />
        </Dialog>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-5">
          {STAGES.map((s) => {
            const items = grouped[s.id];
            const total = items.reduce((sum, d) => sum + d.value, 0);
            return (
              <Column key={s.id} stage={s.id} label={s.label} total={total} count={items.length}>
                {items.map((d) => (
                  <DealCard key={d.id} deal={d} onClick={() => { setEditing(d); setOpen(true); }} members={members} activities={activities} />
                ))}
              </Column>
            );
          })}
        </div>
        <DragOverlay>
          {activeDeal && <DealCardView deal={activeDeal} members={members} activities={activities} />}
        </DragOverlay>
      </DndContext>
    </AppShell>
  );
}

function Column({ stage, label, total, count, children }: { stage: Stage; label: string; total: number; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div ref={setNodeRef} className={`rounded-lg border bg-muted/30 p-3 min-h-[200px] transition-colors ${isOver ? "border-accent bg-accent/10" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-semibold">{label}</div>
          <div className="text-xs text-muted-foreground">{count} · {formatUSD(total)}</div>
        </div>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DealCard({ deal, onClick, members, activities }: { deal: Deal; onClick: () => void; members: Member[]; activities: ActivityLike[] }) {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({ id: deal.id });
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? "none" : "transform 200ms ease, box-shadow 200ms ease",
    opacity: isDragging ? 0.3 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="cursor-grab active:cursor-grabbing"
    >
      <DealCardView deal={deal} members={members} activities={activities} />
    </div>
  );
}

function DealCardView({ deal, members, activities }: { deal: Deal; members: Member[]; activities: ActivityLike[] }) {
  const assignee = members.find((m) => m.id === deal.assigned_to);
  const health = dealHealth(deal, activities);
  return (
    <Card className="p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-semibold leading-tight flex-1">{deal.title}</div>
        <DealHealthBadge health={health} />
      </div>
      <div className="text-xs text-muted-foreground mt-0.5">{deal.client_name}</div>
      <div className="flex items-center justify-between mt-3">
        <span className="text-sm font-bold tabular-nums text-primary">{formatUSD(deal.value)}</span>
        {deal.due_date && <span className="text-xs text-muted-foreground">{formatDate(deal.due_date)}</span>}
      </div>
      {assignee && (
        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
          <div className="h-5 w-5 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-[10px] font-bold">
            {assignee.name.charAt(0)}
          </div>
          {assignee.name}
        </div>
      )}
    </Card>
  );
}

function DealDialog({
  initial, members, onSubmit, onDelete, busy,
}: { initial: Deal | null; members: Member[]; onSubmit: (d: Partial<Deal>) => void; onDelete?: () => void; busy: boolean }) {
  const [form, setForm] = useState<Partial<Deal>>(
    initial ?? { title: "", client_name: "", value: 0, stage: "discovery", due_date: null, assigned_to: null },
  );
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{initial ? "Edit deal" : "New deal"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Title *</Label><Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div><Label>Client *</Label><Input value={form.client_name ?? ""} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Value (USD)</Label><Input type="number" value={form.value ?? 0} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} /></div>
          <div><Label>Due date</Label><Input type="date" value={form.due_date ?? ""} onChange={(e) => setForm({ ...form, due_date: e.target.value || null })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Stage</Label>
            <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v as Stage })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Assignee</Label>
            <Select value={form.assigned_to ?? "none"} onValueChange={(v) => setForm({ ...form, assigned_to: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <DialogFooter className="flex-row justify-between sm:justify-between">
        {onDelete && <Button variant="destructive" onClick={onDelete} type="button"><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>}
        <Button onClick={() => onSubmit(form)} disabled={busy || !form.title || !form.client_name}>Save</Button>
      </DialogFooter>
    </DialogContent>
  );
}
