"use client";

import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { toCSV, downloadCSV } from "@/lib/csv";
import { followUpSuggestion, lookupCompany } from "@/lib/smart";
import { Plus, Search, Trash2, Pencil, Download, Link as LinkIcon, Sparkles, Mail } from "lucide-react";
import { toast } from "sonner";

export default function ContactsPageWrapper() {
  return (
    <RequireAuth>
      <ContactsPage />
    </RequireAuth>
  );
}

type Contact = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  status: "lead" | "client" | "inactive";
  created_at: string;
};

function ContactsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [selected, setSelected] = useState<Contact | null>(null);

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Contact[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (c: Partial<Contact> & { id?: string }) => {
      if (c.id) {
        const { error } = await supabase.from("contacts").update({
          name: c.name, company: c.company, email: c.email, phone: c.phone, status: c.status,
        }).eq("id", c.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contacts").insert({
          user_id: user?.id, name: c.name!, company: c.company, email: c.email, phone: c.phone, status: c.status ?? "lead",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      setOpen(false); setEditing(null);
      toast.success("Contact saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      setSelected(null);
      toast.success("Contact deleted");
    },
  });

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    return contacts.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false;
      if (ql && !`${c.name} ${c.company ?? ""} ${c.email ?? ""}`.toLowerCase().includes(ql)) return false;
      return true;
    });
  }, [contacts, q, filter]);

  return (
    <AppShell title={t("pages.contacts.title")}>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, company, email…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="client">Client</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => {
          const csv = toCSV(filtered, [
            { key: "name", header: "Name" },
            { key: "company", header: "Company" },
            { key: "email", header: "Email" },
            { key: "phone", header: "Phone" },
            { key: "status", header: "Status" },
            { key: "created_at", header: "Date Added" },
          ]);
          downloadCSV(`contacts-${new Date().toISOString().slice(0,10)}.csv`, csv);
        }}>
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Add Contact</Button>
          </DialogTrigger>
          <ContactDialog
            initial={editing}
            onSubmit={(c) => upsert.mutate({ ...c, id: editing?.id })}
            busy={upsert.isPending}
          />
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Date Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => setSelected(c)}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.company ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{c.email ?? "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">{c.phone ?? "—"}</TableCell>
                  <TableCell><StatusBadge value={c.status} /></TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{formatDate(c.created_at)}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No contacts found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-6 px-4 pb-6">
                <Field label="Company" value={selected.company} />
                <Field label="Email" value={selected.email} />
                <Field label="Phone" value={selected.phone} />
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Status</div>
                  <StatusBadge value={selected.status} />
                </div>
                <Field label="Date added" value={formatDate(selected.created_at)} />

                <SmartSuggestion contactId={selected.id} status={selected.status} />

                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    const url = `${window.location.origin}/portal/${selected.id}`;
                    navigator.clipboard.writeText(url);
                    toast.success("Client portal link copied", { description: url });
                  }}
                >
                  <LinkIcon className="h-4 w-4 mr-2" /> Copy Client Portal Link
                </Button>

                <div className="pt-2 border-t">
                  <ActivityTimeline entityType="contact" entityId={selected.id} />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setEditing(selected); setOpen(true); setSelected(null); }}>
                    <Pencil className="h-4 w-4 mr-1" /> Edit
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={() => remove.mutate(selected.id)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div>{value ?? "—"}</div>
    </div>
  );
}

function ContactDialog({
  initial, onSubmit, busy,
}: { initial: Contact | null; onSubmit: (c: Partial<Contact>) => void; busy: boolean }) {
  const [form, setForm] = useState<Partial<Contact>>(
    initial ?? { name: "", company: "", email: "", phone: "", status: "lead" },
  );
  const meta = useMemo(() => lookupCompany(form.company ?? ""), [form.company]);
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{initial ? "Edit contact" : "New contact"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Name *</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div>
          <Label>Company</Label>
          <Input value={form.company ?? ""} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          {meta && (
            <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground bg-accent/10 border border-accent/20 rounded-md px-2 py-1.5">
              <Sparkles className="h-3 w-3 text-accent" />
              <span>Suggested:</span>
              <span className="font-medium text-foreground">{meta.industry}</span>
              <span>·</span>
              <span className="font-medium text-foreground">{meta.timezone}</span>
            </div>
          )}
        </div>
        <div><Label>Email</Label><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div><Label>Phone</Label><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="client">Client</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit(form)} disabled={busy || !form.name}>Save</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function SmartSuggestion({ contactId, status }: { contactId: string; status: string }) {
  const { data: lastTouch } = useQuery({
    queryKey: ["activities", "contact", contactId, "last"],
    enabled: !!contactId,
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("created_at")
        .eq("entity_type", "contact")
        .eq("entity_id", contactId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.created_at as string | undefined;
    },
  });
  const suggestion = followUpSuggestion(lastTouch, status);
  if (!suggestion) return null;
  return (
    <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="h-4 w-4 text-amber-600" /> Smart suggestion
      </div>
      <p className="text-sm text-muted-foreground">{suggestion.message}</p>
      <div className="flex items-center gap-2 text-xs">
        <Mail className="h-3 w-3" />
        <span className="text-muted-foreground">Suggested template:</span>
        <span className="font-medium">{suggestion.templateHint}</span>
      </div>
    </div>
  );
}
