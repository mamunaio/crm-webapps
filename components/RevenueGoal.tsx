import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { formatUSD } from "@/lib/format";
import { Target, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

export function RevenueGoal({ paidThisMonth }: { paidThisMonth: number }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const monthKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  })();

  const { data: goal } = useQuery({
    queryKey: ["monthly_goal", user!.id, monthKey],
    queryFn: async () => {
      const { data } = await supabase
        .from("monthly_goals")
        .select("*").eq("month", monthKey).maybeSingle();
      return data;
    },
  });

  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");

  useEffect(() => {
    if (goal) setVal(String(goal.target));
    else if (!val) setVal("10000");
  }, [goal]);

  const save = useMutation({
    mutationFn: async () => {
      const target = Number(val);
      const { error } = await supabase.from("monthly_goals").upsert({
        user_id: user!.id, month: monthKey, target,
      }, { onConflict: "user_id,month" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["monthly_goal"] });
      setEditing(false);
      toast.success("Goal updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const target = Number(goal?.target ?? 0);
  const pct = target > 0 ? Math.min(100, (paidThisMonth / target) * 100) : 0;
  const monthLabel = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2"><Target className="h-4 w-4 text-accent" /> Revenue Goal</span>
          <span className="text-xs font-normal text-muted-foreground">{monthLabel}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {editing ? (
          <div className="flex gap-2">
            <Input type="number" value={val} onChange={(e) => setVal(e.target.value)} placeholder="Target ($)" />
            <Button size="icon" onClick={() => save.mutate()} disabled={save.isPending}><Check className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => setEditing(false)}><X className="h-4 w-4" /></Button>
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-2xl font-bold tabular-nums">{formatUSD(paidThisMonth)}</div>
                <div className="text-xs text-muted-foreground">of {formatUSD(target)} target</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-3 w-3 mr-1" /> {goal ? "Edit" : "Set goal"}
              </Button>
            </div>
            <Progress value={pct} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{pct.toFixed(0)}% achieved</span>
              <span>{target > paidThisMonth ? `${formatUSD(target - paidThisMonth)} to go` : "🎉 Goal reached"}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
