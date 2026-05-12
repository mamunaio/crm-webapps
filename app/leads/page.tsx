"use client";

import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/StatusBadge";
import { ActivityTimeline, logStatusChange } from "@/components/ActivityTimeline";
import { LeadScoreBadge } from "@/components/SmartBadges";
import { scoreLead, type ActivityLike } from "@/lib/smart";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toCSV, downloadCSV } from "@/lib/csv";
import { Plus, ArrowRight, Download, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function LeadsPageWrapper() {
  return (
    <RequireAuth>
      <LeadsPage />
    </RequireAuth>
  );
}

type Lead = {
  id: string; name: string; company: string | null; email: string | null;
  source: "referral" | "website" | "social_media" | "cold_outreach";
  status: "new" | "contacted" | "qualified" | "proposal_sent" | "converted";
  assigned_to: string | null; notes: string | null;
  created_at?: string;
};
type Member = { id: string; name: string };

const SOURCES = ["referral", "website", "social_media", "cold_outreach"] as const;
const STATUSES = ["new", "contacted", "qualified", "proposal_sent", "converted"] as const;

function LeadsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [selected, setSelected] = useState<Lead | null>(null);

  const { data: leads = [] } = useQuery({
    queryKey: ["leads", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
  });
  const { data: members = [] } = useQuery({
    queryKey: ["team_members", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("team_members").select("id,name").order("name");
      if (error) throw error;
      return data as Member[];
    },
  });
  const { data: activities = [] } = useQuery({
    queryKey: ["activities", "lead", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("entity_id,entity_type,created_at,type")
        .eq("entity_type", "lead")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ActivityLike[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (l: Partial<Lead> & { id?: string }) => {
      if (l.id) {
        const { error } = await supabase.from("leads").update({
          name: l.name, company: l.company, email: l.email, source: l.source, status: l.status,
          assigned_to: l.assigned_to, notes: l.notes,
        }).eq("id", l.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("leads").insert({
          user_id: user!.id, name: l.name!, company: l.company, email: l.email,
          source: l.source ?? "website", status: l.status ?? "new",
          assigned_to: l.assigned_to, notes: l.notes,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      setOpen(false); setEditing(null);
      toast.success("Lead saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateField = useMutation({
    mutationFn: async ({ id, patch, prevStatus }: { id: string; patch: Partial<Lead>; prevStatus?: string }) => {
      const { error } = await supabase.from("leads").update(patch).eq("id", id);
      if (error) throw error;
      if (patch.status && prevStatus && patch.status !== prevStatus) {
        await logStatusChange(user!.id, "lead", id, `Status changed: ${prevStatus.replace("_"," ")} → ${patch.status.replace("_"," ")}`);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });

  const convert = useMutation({
    mutationFn: async (lead: Lead) => {
      // Create contact as client
      const { error: cErr } = await supabase.from("contacts").insert({
        user_id: user!.id, name: lead.name, company: lead.company, email: lead.email, status: "client",
      });
      if (cErr) throw cErr;
      // Create discovery deal
      const { error: dErr } = await supabase.from("deals").insert({
        user_id: user!.id, title: `${lead.company ?? lead.name} — opportunity`,
        client_name: lead.company ?? lead.name, value: 0, stage: "discovery",
        assigned_to: lead.assigned_to,
      });
      if (dErr) throw dErr;
      // Mark lead converted
      const { error: lErr } = await supabase.from("leads").update({ status: "converted" }).eq("id", lead.id);
      if (lErr) throw lErr;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Lead converted to client + deal created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AppShell title={t("pages.leads.title")}>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <p className="text-muted-foreground">{leads.length} leads in pipeline</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            const csv = toCSV(leads, [
              { key: "name", header: "Name" },
              { key: "company", header: "Company" },
              { key: "email", header: "Email" },
              { key: "source", header: "Source" },
              { key: "status", header: "Status" },
              { key: "notes", header: "Notes" },
            ]);
            downloadCSV(`leads-${new Date().toISOString().slice(0,10)}.csv`, csv);
          }}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Add Lead</Button></DialogTrigger>
            <LeadDialog initial={editing} members={members} onSubmit={(l) => upsert.mutate({ ...l, id: editing?.id })} busy={upsert.isPending} />
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Company</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Assignee</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((l) => {
                const { score, tier } = scoreLead(l, activities);
                return <TableRow key={l.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{l.name}</span>
                      <LeadScoreBadge score={score} tier={tier} />
                    </div>
                    <div className="text-xs text-muted-foreground">{l.email}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{l.company ?? "—"}</TableCell>
                  <TableCell><StatusBadge value={l.source} /></TableCell>
                  <TableCell>
                    <Select value={l.status} onValueChange={(v) => updateField.mutate({ id: l.id, patch: { status: v as any }, prevStatus: l.status })}>
                      <SelectTrigger className="h-8 w-[140px] border-none bg-transparent p-0 hover:bg-muted">
                        <StatusBadge value={l.status} />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Select value={l.assigned_to ?? "none"} onValueChange={(v) => updateField.mutate({ id: l.id, patch: { assigned_to: v === "none" ? null : v } })}>
                      <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setSelected(l)}>
                        <MessageSquare className="h-3 w-3 mr-1" /> Notes
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(l); setOpen(true); }}>Edit</Button>
                      {l.status !== "converted" && (
                        <Button variant="outline" size="sm" onClick={() => convert.mutate(l)}>
                          Convert <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>;
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader><SheetTitle>{selected.name}</SheetTitle></SheetHeader>
              <div className="space-y-4 mt-6 px-4 pb-6">
                <div className="text-sm text-muted-foreground">
                  {selected.company ?? "—"} · {selected.email ?? "—"}
                </div>
                <div className="flex gap-2">
                  <StatusBadge value={selected.source} />
                  <StatusBadge value={selected.status} />
                </div>
                {selected.notes && (
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Notes</div>
                    <p className="text-sm">{selected.notes}</p>
                  </div>
                )}
                <div className="pt-2 border-t">
                  <ActivityTimeline entityType="lead" entityId={selected.id} />
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

function LeadDialog({
  initial, members, onSubmit, busy,
}: { initial: Lead | null; members: Member[]; onSubmit: (l: Partial<Lead>) => void; busy: boolean }) {
  const [form, setForm] = useState<Partial<Lead>>(
    initial ?? { name: "", company: "", email: "", source: "website", status: "new", assigned_to: null, notes: "" },
  );
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{initial ? "Edit lead" : "New lead"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Name *</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Company</Label><Input value={form.company ?? ""} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Source</Label>
            <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Assigned to</Label>
          <Select value={form.assigned_to ?? "none"} onValueChange={(v) => setForm({ ...form, assigned_to: v === "none" ? null : v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Notes</Label><Textarea rows={3} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit(form)} disabled={busy || !form.name}>Save</Button>
      </DialogFooter>
    </DialogContent>
  );
}
