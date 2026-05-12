"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type NotificationType = "task_overdue" | "invoice_due" | "lead_followup" | "manual";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  description?: string;
  createdAt: string; // ISO
  read: boolean;
  link?: string;
  // for auto-generated, a stable key prevents duplicates
  sourceKey?: string;
};

type Ctx = {
  notifications: Notification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  addManual: (n: { title: string; description?: string; link?: string }) => void;
  clearAll: () => void;
};

const NotificationContext = createContext<Ctx | undefined>(undefined);
const STORAGE_KEY_PREFIX = "pinnacle-notifications:";

function loadStored(userId: string): Notification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + userId);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Notification[];
  } catch {
    return [];
  }
}

function saveStored(userId: string, items: Notification[]) {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + userId, JSON.stringify(items));
  } catch {}
}

function daysBetween(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / 86400000);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? "anon";
  const [items, setItems] = useState<Notification[]>([]);

  // Load from localStorage when user changes
  useEffect(() => {
    setItems(loadStored(userId));
  }, [userId]);

  // Persist
  useEffect(() => {
    if (!user) return;
    saveStored(userId, items);
  }, [items, userId, user]);

  // Pull data only when authenticated
  const enabled = !!user;

  const { data: tasks = [] } = useQuery({
    queryKey: ["notif-tasks", userId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id,title,due_date,status");
      if (error) throw error;
      return data as Array<{ id: string; title: string; due_date: string | null; status: string }>;
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["notif-invoices", userId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id,invoice_number,due_date,status,client_name");
      if (error) throw error;
      return data as Array<{
        id: string; invoice_number: string; due_date: string;
        status: string; client_name: string;
      }>;
    },
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["notif-leads", userId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id,name,status,created_at");
      if (error) throw error;
      return data as Array<{ id: string; name: string; status: string; created_at: string }>;
    },
  });

  // Compute auto notifications
  const autoNotifications = useMemo<Notification[]>(() => {
    const now = new Date();
    const list: Notification[] = [];

    // Overdue tasks
    for (const t of tasks) {
      if (!t.due_date || t.status === "done") continue;
      const due = new Date(t.due_date);
      if (due < now) {
        list.push({
          id: `auto:task:${t.id}`,
          sourceKey: `task:${t.id}`,
          type: "task_overdue",
          title: "Task overdue",
          description: `"${t.title}" was due ${due.toLocaleDateString()}`,
          createdAt: due.toISOString(),
          read: false,
          link: "/tasks",
        });
      }
    }

    // Invoice due in 3 days (and not paid)
    for (const inv of invoices) {
      if (inv.status === "paid") continue;
      const due = new Date(inv.due_date);
      const days = daysBetween(due, now);
      if (days >= 0 && days <= 3) {
        list.push({
          id: `auto:invoice:${inv.id}`,
          sourceKey: `invoice:${inv.id}`,
          type: "invoice_due",
          title: `Invoice ${inv.invoice_number} due soon`,
          description: `${inv.client_name} — due ${due.toLocaleDateString()}`,
          createdAt: now.toISOString(),
          read: false,
          link: "/invoices",
        });
      }
    }

    // Lead follow-up: not contacted in 7+ days (proxy: status still new/contacted, created 7+ days ago)
    for (const l of leads) {
      if (l.status !== "new" && l.status !== "contacted") continue;
      const created = new Date(l.created_at);
      const days = daysBetween(now, created);
      if (days >= 7) {
        list.push({
          id: `auto:lead:${l.id}`,
          sourceKey: `lead:${l.id}`,
          type: "lead_followup",
          title: "Lead needs follow-up",
          description: `${l.name} — no progress in ${days} days`,
          createdAt: now.toISOString(),
          read: false,
          link: "/leads",
        });
      }
    }

    return list;
  }, [tasks, invoices, leads]);

  // Merge autos with stored: preserve read state for known sourceKeys; keep manuals as-is
  const merged = useMemo<Notification[]>(() => {
    const readMap = new Map<string, boolean>();
    const removedAutos = new Set<string>();
    const manuals: Notification[] = [];
    for (const it of items) {
      if (it.type === "manual") {
        manuals.push(it);
      } else if (it.sourceKey) {
        readMap.set(it.sourceKey, it.read);
        // also track tombstones via id prefix __removed__
        if ((it as any).removed) removedAutos.add(it.sourceKey);
      }
    }
    const autos = autoNotifications
      .filter((n) => !removedAutos.has(n.sourceKey!))
      .map((n) => ({ ...n, read: readMap.get(n.sourceKey!) ?? false }));
    return [...autos, ...manuals].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [autoNotifications, items]);

  const unreadCount = merged.filter((n) => !n.read).length;

  const upsertStored = useCallback((updater: (prev: Notification[]) => Notification[]) => {
    setItems((prev) => updater(prev));
  }, []);

  const markRead = useCallback((id: string) => {
    const target = merged.find((n) => n.id === id);
    if (!target) return;
    upsertStored((prev) => {
      if (target.type === "manual") {
        return prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      }
      // auto: store/update read flag by sourceKey
      const key = target.sourceKey!;
      const existing = prev.find((n) => n.sourceKey === key && n.type !== "manual");
      if (existing) return prev.map((n) => (n === existing ? { ...n, read: true } : n));
      return [...prev, { ...target, read: true }];
    });
  }, [merged, upsertStored]);

  const markAllRead = useCallback(() => {
    upsertStored((prev) => {
      const next = [...prev];
      // mark all manuals
      for (let i = 0; i < next.length; i++) {
        if (next[i].type === "manual") next[i] = { ...next[i], read: true };
      }
      // ensure each auto has a stored read=true entry
      for (const n of merged) {
        if (n.type === "manual") continue;
        const key = n.sourceKey!;
        const idx = next.findIndex((s) => s.sourceKey === key && s.type !== "manual");
        if (idx >= 0) next[idx] = { ...next[idx], read: true };
        else next.push({ ...n, read: true });
      }
      return next;
    });
  }, [merged, upsertStored]);

  const remove = useCallback((id: string) => {
    const target = merged.find((n) => n.id === id);
    if (!target) return;
    upsertStored((prev) => {
      if (target.type === "manual") return prev.filter((n) => n.id !== id);
      // tombstone an auto
      const key = target.sourceKey!;
      const filtered = prev.filter((n) => !(n.sourceKey === key && n.type !== "manual"));
      return [...filtered, { ...target, read: true, removed: true } as any];
    });
  }, [merged, upsertStored]);

  const addManual = useCallback(
    ({ title, description, link }: { title: string; description?: string; link?: string }) => {
      const n: Notification = {
        id: `manual:${crypto.randomUUID()}`,
        type: "manual",
        title,
        description,
        link,
        createdAt: new Date().toISOString(),
        read: false,
      };
      upsertStored((prev) => [n, ...prev]);
    },
    [upsertStored]
  );

  const clearAll = useCallback(() => setItems([]), []);

  const value: Ctx = { notifications: merged, unreadCount, markRead, markAllRead, remove, addManual, clearAll };
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
