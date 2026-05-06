import { Bell, CheckCheck, X, AlertTriangle, FileText, UserPlus, BellRing, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, type NotificationType } from "@/lib/notifications";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const ICONS: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  task_overdue: AlertTriangle,
  invoice_due: FileText,
  lead_followup: UserPlus,
  manual: BellRing,
};

const ICON_COLOR: Record<NotificationType, string> = {
  task_overdue: "text-destructive",
  invoice_due: "text-warning",
  lead_followup: "text-info",
  manual: "text-accent",
};

function relativeTime(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  return `${days}d ago`;
}

function ManualReminderDialog({ onCreate }: { onCreate: (n: { title: string; description?: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 px-2 gap-1">
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New reminder</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Follow up with Acme Corp" />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (!title.trim()) return;
              onCreate({ title: title.trim(), description: description.trim() || undefined });
              setTitle(""); setDescription(""); setOpen(false);
            }}
          >Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead, remove, addManual } = useNotifications();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-semibold">Notifications</div>
          <div className="flex items-center gap-2">
            <ManualReminderDialog onCreate={addManual} />
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 gap-1 text-xs"
              onClick={markAllRead}
              disabled={unreadCount === 0}
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </Button>
          </div>
        </div>
        <ScrollArea className="max-h-[420px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              You're all caught up 🎉
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => {
                const Icon = ICONS[n.type];
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "group relative flex gap-3 px-4 py-3 cursor-pointer hover:bg-muted/60 transition-colors",
                      !n.read && "bg-accent/5"
                    )}
                    onClick={() => {
                      markRead(n.id);
                      if (n.link) {
                        setOpen(false);
                        router.push(n.link);
                      }
                    }}
                  >
                    {!n.read && (
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-accent" />
                    )}
                    <div className={cn("mt-0.5 shrink-0", ICON_COLOR[n.type])}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{n.title}</div>
                      {n.description && (
                        <div className="text-xs text-muted-foreground line-clamp-2">{n.description}</div>
                      )}
                      <div className="text-[11px] text-muted-foreground/80 mt-1">{relativeTime(n.createdAt)}</div>
                    </div>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                      onClick={(e) => { e.stopPropagation(); remove(n.id); }}
                      aria-label="Dismiss"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
