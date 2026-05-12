"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatUSD, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { RevenueGoal } from "@/components/RevenueGoal";
import { SortableItem } from "@/components/SortableItem";
import { useOrderedIds } from "@/lib/dnd-order";
import {
  Users, Target, Kanban, FileText, CheckSquare, Plus, TrendingUp,
} from "lucide-react";
import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import {
  DndContext, PointerSensor, useSensor, useSensors, closestCenter, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, rectSortingStrategy, verticalListSortingStrategy,
} from "@dnd-kit/sortable";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  );
}

const KPI_IDS = ["leads", "clients", "deals", "invoices", "tasks"] as const;
const WIDGET_IDS = ["goal", "revenue", "activity", "latest_invoices", "tasks_due"] as const;

function Dashboard() {
  const { user } = useAuth();
  const uid = user?.id;
  const { t } = useTranslation();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", uid],
    enabled: !!uid,
    queryFn: async () => {
      const [contacts, leads, deals, invoices, tasks] = await Promise.all([
        supabase.from("contacts").select("id,status,created_at,name").order("created_at", { ascending: false }),
        supabase.from("leads").select("id,status,name,created_at").order("created_at", { ascending: false }),
        supabase.from("deals").select("id,stage,value,title,created_at").order("created_at", { ascending: false }),
        supabase.from("invoices").select("id,status,total,issue_date,client_name,invoice_number").order("issue_date", { ascending: false }),
        supabase.from("tasks").select("id,status,due_date,title,created_at").order("created_at", { ascending: false }),
      ]);
      return {
        contacts: contacts.data ?? [],
        leads: leads.data ?? [],
        deals: deals.data ?? [],
        invoices: invoices.data ?? [],
        tasks: tasks.data ?? [],
      };
    },
  });

  const stats = (() => {
    if (!data) return null;
    const today = new Date().toISOString().slice(0, 10);
    return {
      totalLeads: data.leads.length,
      activeClients: data.contacts.filter((c) => c.status === "client").length,
      openDeals: data.deals.filter((d) => !["won", "lost"].includes(d.stage)).length,
      pendingInvoices: data.invoices.filter((i) => ["sent", "overdue", "draft"].includes(i.status)).length,
      tasksDueToday: data.tasks.filter((t) => t.due_date === today && t.status !== "done").length,
    };
  })();

  const revenueChart = (() => {
    if (!data) return [];
    const months: { key: string; label: string; revenue: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({ key, label: d.toLocaleString("en-US", { month: "short" }), revenue: 0 });
    }
    data.invoices
      .filter((i) => i.status === "paid")
      .forEach((i) => {
        const k = i.issue_date.slice(0, 7);
        const m = months.find((mm) => mm.key === k);
        if (m) m.revenue += Number(i.total);
      });
    return months;
  })();

  const paidThisMonth = (() => {
    if (!data) return 0;
    const now = new Date();
    const k = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return data.invoices
      .filter((i) => i.status === "paid" && i.issue_date.slice(0, 7) === k)
      .reduce((s, i) => s + Number(i.total), 0);
  })();

  const recent = (() => {
    if (!data) return [];
    type Activity = { type: string; label: string; date: string };
    const items: Activity[] = [];
    data.contacts.slice(0, 3).forEach((c) => items.push({ type: "Contact added", label: c.name, date: c.created_at }));
    data.leads.slice(0, 3).forEach((l) => items.push({ type: "Lead created", label: l.name, date: l.created_at }));
    data.deals.slice(0, 3).forEach((d) => items.push({ type: "Deal updated", label: d.title, date: d.created_at }));
    data.invoices.slice(0, 3).forEach((i) => items.push({ type: `Invoice ${i.invoice_number}`, label: i.client_name, date: i.issue_date }));
    return items.sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 8);
  })();

  // Sortable orders
  const allKpiIds = useMemo(() => [...KPI_IDS], []);
  const allWidgetIds = useMemo(() => [...WIDGET_IDS], []);
  const [kpiOrder, setKpiOrder] = useOrderedIds(`dash-kpis:${uid}`, allKpiIds);
  const [widgetOrder, setWidgetOrder] = useOrderedIds(`dash-widgets:${uid}`, allWidgetIds);

  const onKpiDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = kpiOrder.indexOf(String(active.id));
    const newIdx = kpiOrder.indexOf(String(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    setKpiOrder(arrayMove(kpiOrder, oldIdx, newIdx));
  };
  const onWidgetDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = widgetOrder.indexOf(String(active.id));
    const newIdx = widgetOrder.indexOf(String(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    setWidgetOrder(arrayMove(widgetOrder, oldIdx, newIdx));
  };

  const kpis: Record<string, React.ReactNode> = {
    leads: <KpiCard icon={Target} label={t("pages.dashboard.totalLeads")} value={stats?.totalLeads ?? 0} loading={isLoading} />,
    clients: <KpiCard icon={Users} label={t("pages.dashboard.activeClients")} value={stats?.activeClients ?? 0} loading={isLoading} />,
    deals: <KpiCard icon={Kanban} label={t("pages.dashboard.openDeals")} value={stats?.openDeals ?? 0} loading={isLoading} />,
    invoices: <KpiCard icon={FileText} label={t("pages.dashboard.pendingInvoices")} value={stats?.pendingInvoices ?? 0} loading={isLoading} />,
    tasks: <KpiCard icon={CheckSquare} label={t("pages.dashboard.tasksDueToday")} value={stats?.tasksDueToday ?? 0} loading={isLoading} accent />,
  };

  const widgets: Record<string, { node: React.ReactNode; className?: string }> = {
    goal: {
      node: <RevenueGoal paidThisMonth={paidThisMonth} />,
      className: "lg:col-span-2",
    },
    revenue: {
      node: (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-accent" /> {t("pages.dashboard.revenueLast6")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="label" stroke="currentColor" fontSize={12} />
                  <YAxis stroke="currentColor" fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v: number) => formatUSD(v)}
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6 }}
                  />
                  <Bar dataKey="revenue" fill="var(--accent)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ),
      className: "lg:col-span-2",
    },
    activity: {
      node: (
        <Card>
          <CardHeader><CardTitle className="text-base">{t("pages.dashboard.recentActivity")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {recent.map((r, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{r.label}</div>
                  <div className="text-xs text-muted-foreground">{r.type} · {formatDate(r.date)}</div>
                </div>
              </div>
            ))}
            {recent.length === 0 && <p className="text-sm text-muted-foreground">{t("pages.dashboard.noActivity")}</p>}
          </CardContent>
        </Card>
      ),
    },
    latest_invoices: {
      node: (
        <Card>
          <CardHeader><CardTitle className="text-base">{t("pages.dashboard.latestInvoices")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data?.invoices.slice(0, 5).map((i) => (
              <div key={i.id} className="flex items-center justify-between border-b last:border-0 py-2">
                <div>
                  <div className="font-medium text-sm">{i.invoice_number} · {i.client_name}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(i.issue_date)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold tabular-nums">{formatUSD(i.total)}</span>
                  <StatusBadge value={i.status} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ),
    },
    tasks_due: {
      node: (
        <Card>
          <CardHeader><CardTitle className="text-base">{t("pages.dashboard.tasksDueSoon")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data?.tasks
              .filter((t) => t.status !== "done")
              .slice(0, 5)
              .map((t) => (
                <div key={t.id} className="flex items-center justify-between border-b last:border-0 py-2">
                  <div className="font-medium text-sm">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(t.due_date)}</div>
                </div>
              ))}
          </CardContent>
        </Card>
      ),
    },
  };

  return (
    <AppShell title={t("pages.dashboard.title")}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <p className="text-muted-foreground">{t("pages.dashboard.welcome")}</p>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm"><Link href="/leads"><Plus className="h-4 w-4 mr-1" /> {t("pages.dashboard.addLead")}</Link></Button>
          <Button asChild variant="outline" size="sm"><Link href="/invoices"><Plus className="h-4 w-4 mr-1" /> {t("pages.dashboard.newInvoice")}</Link></Button>
          <Button asChild size="sm"><Link href="/tasks"><Plus className="h-4 w-4 mr-1" /> {t("pages.dashboard.addTask")}</Link></Button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onKpiDragEnd}>
        <SortableContext items={kpiOrder} strategy={rectSortingStrategy}>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5 mb-6">
            {kpiOrder.map((id) => (
              <SortableItem key={id} id={id}>{kpis[id]}</SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onWidgetDragEnd}>
        <SortableContext items={widgetOrder} strategy={verticalListSortingStrategy}>
          <div className="grid gap-4 lg:grid-cols-2">
            {widgetOrder.map((id) => {
              const w = widgets[id];
              if (!w) return null;
              return (
                <SortableItem key={id} id={id} className={w.className}>
                  {w.node}
                </SortableItem>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </AppShell>
  );
}

function KpiCard({
  icon: Icon, label, value, loading, accent,
}: { icon: any; label: string; value: number; loading: boolean; accent?: boolean }) {
  return (
    <Card className={accent ? "border-accent/40" : ""}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
          <Icon className={`h-4 w-4 ${accent ? "text-accent" : "text-muted-foreground"}`} />
        </div>
        <div className="text-3xl font-bold mt-2 tabular-nums">{loading ? "—" : value}</div>
      </CardContent>
    </Card>
  );
}
