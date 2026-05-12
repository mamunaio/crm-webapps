import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, RefreshCw, Bell, Trash2 } from "lucide-react";
import { toast } from "sonner";

type EntityType = "contact" | "lead";
type Activity = {
  id: string;
  type: "note" | "status_change" | "follow_up";
  content: string;
  created_at: string;
};

export function ActivityTimeline({
  entityType, entityId,
}: { entityType: EntityType; entityId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const key = ["activities", entityType, entityId];

  const { data: items = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("id,type,content,created_at")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Activity[];
    },
  });

  const add = useMutation({
    mutationFn: async (type: "note" | "follow_up") => {
      const { error } = await supabase.from("activities").insert({
        user_id: user!.id,
        entity_type: entityType,
        entity_id: entityId,
        type,
        content: note,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNote("");
      qc.invalidateQueries({ queryKey: key });
      toast.success("Note added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("activities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return (
    <div className="space-y-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">Notes & Activity</div>
      <div className="space-y-2">
        <Textarea
          rows={2}
          placeholder="Add a note or follow-up reminder…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="flex gap-2">
          <Button size="sm" disabled={!note.trim() || add.isPending} onClick={() => add.mutate("note")}>
            <MessageSquare className="h-3 w-3 mr-1" /> Add note
          </Button>
          <Button size="sm" variant="outline" disabled={!note.trim() || add.isPending} onClick={() => add.mutate("follow_up")}>
            <Bell className="h-3 w-3 mr-1" /> Log follow-up
          </Button>
        </div>
      </div>

      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {items.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
        {items.map((a) => (
          <div key={a.id} className="flex gap-3 group">
            <div className="mt-1">
              {a.type === "note" && <MessageSquare className="h-4 w-4 text-accent" />}
              {a.type === "status_change" && <RefreshCw className="h-4 w-4 text-primary" />}
              {a.type === "follow_up" && <Bell className="h-4 w-4 text-amber-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm whitespace-pre-wrap">{a.content}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {new Date(a.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
              </div>
            </div>
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100"
              onClick={() => remove.mutate(a.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export async function logStatusChange(
  userId: string, entityType: EntityType, entityId: string, content: string,
) {
  await supabase.from("activities").insert({
    user_id: userId, entity_type: entityType, entity_id: entityId,
    type: "status_change", content,
  });
}
