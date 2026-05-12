"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatUSD } from "@/lib/format";
import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  Cell, Pie, PieChart,
} from "recharts";
import { TrendingUp, Target, Kanban, Users } from "lucide-react";

export default function ReportsPageWrapper() {
  return (
    <RequireAuth>
      <ReportsPage />
    </RequireAuth>
  );
}

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088fe", "#00C49F", "#FFBB28", "#FF8042"];

function ReportsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const uid = user?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["reports_data", uid],
    enabled: !!uid,
    queryFn: async () => {
      const [leads, deals, invoices, members] = await Promise.all([
        supabase.from("leads").select("id,status,source"),
        supabase.from("deals").select("id,stage,value,assigned_to"),
        supabase.from("invoices").select("id,status,total,issue_date"),
        supabase.from("team_members").select("id,name"),
      ]);

      return {
        leads: leads.data ?? [],
        deals: deals.data ?? [],
        invoices: invoices.data ?? [],
        members: members.data ?? [],
      };
    },
  });

  const revenueData = (() => {
    if (!data) return [];
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = 0;
    }

    data.invoices
      .filter((i) => i.status === "paid")
      .forEach((i) => {
        const key = i.issue_date.slice(0, 7);
        if (months[key] !== undefined) months[key] += Number(i.total);
      });

    return Object.entries(months).map(([key, val]) => ({
      name: new Date(key + "-01").toLocaleString("en-US", { month: "short" }),
      revenue: val,
    }));
  })();

  const pipelineData = (() => {
    if (!data) return [];
    const stages: Record<string, number> = {};
    data.deals.forEach((d) => {
      const s = d.stage || "unknown";
      stages[s] = (stages[s] || 0) + 1;
    });
    return Object.entries(stages).map(([name, value]) => ({ name: name.replace("_", " "), value }));
  })();

  const sourceData = (() => {
    if (!data) return [];
    const sources: Record<string, number> = {};
    data.leads.forEach((l) => {
      const s = l.source || "unknown";
      sources[s] = (sources[s] || 0) + 1;
    });
    return Object.entries(sources).map(([name, value]) => ({ name: name.replace("_", " "), value }));
  })();

  const performanceData = (() => {
    if (!data) return [];
    return data.members.map((m) => {
      const assignedDeals = data.deals.filter((d) => d.assigned_to === m.id);
      return {
        name: m.name,
        deals: assignedDeals.length,
        value: assignedDeals.reduce((s, d) => s + Number(d.value), 0),
      };
    });
  })();

  const totalRevenue = data?.invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + Number(i.total), 0) ?? 0;

  const conversionRate = data?.leads.length 
    ? ((data.leads.filter(l => l.status === "converted").length / data.leads.length) * 100).toFixed(1) 
    : 0;

  return (
    <AppShell title={t("pages.reports.title", "Reports")}>
      <p className="text-muted-foreground mb-6">
        {t("pages.reports.subtitle", "Insights across revenue, pipeline, and team performance")}
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <ReportStatCard icon={TrendingUp} label="Total Revenue" value={formatUSD(totalRevenue)} loading={isLoading} />
        <ReportStatCard icon={Target} label="Lead Conversion" value={`${conversionRate}%`} loading={isLoading} />
        <ReportStatCard icon={Kanban} label="Open Deals" value={data?.deals.filter(d => !["won", "lost"].includes(d.stage)).length ?? 0} loading={isLoading} />
        <ReportStatCard icon={Users} label="Team Members" value={data?.members.length ?? 0} loading={isLoading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Revenue Growth</CardTitle>
            <CardDescription>Monthly revenue from paid invoices over the last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                  <Tooltip formatter={(v: number) => formatUSD(v)} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
                  <Bar dataKey="revenue" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Pipeline Distribution</CardTitle>
            <CardDescription>Number of deals currently in each stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" fontSize={12} tickLine={false} axisLine={false} width={100} />
                  <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
                  <Bar dataKey="value" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-center">Lead Sources</CardTitle>
            <CardDescription className="text-center">Distribution of leads by their original source</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Team Performance</CardTitle>
            <CardDescription>Value of deals assigned per team member</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                  <Tooltip formatter={(v: number) => formatUSD(v)} />
                  <Bar dataKey="value" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function ReportStatCard({ icon: Icon, label, value, loading }: { icon: any; label: string; value: string | number; loading: boolean }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold tabular-nums">{loading ? "—" : value}</div>
      </CardContent>
    </Card>
  );
}
