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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

export default function TasksPageWrapper() {
  return (
    <RequireAuth>
      <TasksPage />
    </RequireAuth>
  );
}

type Task = {
  id: string;
  title: string;
  due_date: string | null;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "done";
  linked_contact_id: string | null;
  linked_contact_name: string | null;
  created_at?: string;
};

type Contact = { id: string; name: string };

const PRIORITIES = ["low", "medium", "high"] as const;
const STATUSES = ["pending", "in_progress", "done"] as const;

function TasksPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Task[];
    },
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts_list", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("id,name").order("name");
      if (error) throw error;
      return data as Contact[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (t: Partial<Task> & { id?: string }) => {
      const payload = {
        title: t.title!,
        priority: t.priority ?? "medium",
        status: t.status ?? "pending",
        due_date: t.due_date || null,
        linked_contact_id: t.linked_contact_id || null,
        linked_contact_name: t.linked_contact_id ? contacts.find(c => c.id === t.linked_contact_id)?.name || null : null,
      };

      if (t.id) {
        const { error } = await supabase.from("tasks").update(payload).eq("id", t.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tasks").insert({
          user_id: user!.id,
          ...payload,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setOpen(false);
      setEditing(null);
      toast.success("Task saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateField = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Task> }) => {
      const { error } = await supabase.from("tasks").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AppShell title={t("pages.tasks.title", "Tasks")}>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <p className="text-muted-foreground">{tasks.length} tasks</p>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Add Task</Button></DialogTrigger>
          <TaskDialog
            initial={editing}
            contacts={contacts}
            onSubmit={(task) => upsert.mutate({ ...task, id: editing?.id })}
            busy={upsert.isPending}
          />
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Contact</TableHead>
                <TableHead className="hidden md:table-cell">Due Date</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t("pages.tasks.noTasks", "No tasks.")}
                  </TableCell>
                </TableRow>
              )}
              {tasks.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.title}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {t.linked_contact_name || "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {t.due_date ? formatDate(t.due_date) : "—"}
                  </TableCell>
                  <TableCell>
                    <Select value={t.priority} onValueChange={(v) => updateField.mutate({ id: t.id, patch: { priority: v as any } })}>
                      <SelectTrigger className="h-8 w-[120px] border-none bg-transparent p-0 hover:bg-muted focus:ring-0">
                        <StatusBadge value={t.priority} />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={t.status} onValueChange={(v) => updateField.mutate({ id: t.id, patch: { status: v as any } })}>
                      <SelectTrigger className="h-8 w-[130px] border-none bg-transparent p-0 hover:bg-muted focus:ring-0">
                        <StatusBadge value={t.status} />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(t); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove.mutate(t.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function TaskDialog({
  initial, contacts, onSubmit, busy,
}: { initial: Task | null; contacts: Contact[]; onSubmit: (t: Partial<Task>) => void; busy: boolean }) {
  const [form, setForm] = useState<Partial<Task>>(
    initial ?? { title: "", due_date: "", priority: "medium", status: "pending", linked_contact_id: "none" }
  );

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{initial ? "Edit task" : "New task"}</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>Title *</Label>
          <Input autoFocus value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Due Date</Label>
            <Input type="date" value={form.due_date ?? ""} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
          <div>
            <Label>Linked Contact</Label>
            <Select value={form.linked_contact_id ?? "none"} onValueChange={(v) => setForm({ ...form, linked_contact_id: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
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
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit(form)} disabled={busy || !form.title?.trim()}>Save</Button>
      </DialogFooter>
    </DialogContent>
  );
}
