import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Target,
  Kanban,
  FileText,
  CheckSquare,
  Settings,
  LogOut,
  Briefcase,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const items = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, exact: true },
  { to: "/contacts", labelKey: "nav.contacts", icon: Users },
  { to: "/leads", labelKey: "nav.leads", icon: Target },
  { to: "/deals", labelKey: "nav.deals", icon: Kanban },
  { to: "/invoices", labelKey: "nav.invoices", icon: FileText },
  { to: "/tasks", labelKey: "nav.tasks", icon: CheckSquare },
  { to: "/reports", labelKey: "nav.reports", icon: BarChart3 },
  { to: "/settings", labelKey: "nav.settings", icon: Settings },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { signOut, user } = useAuth();
  const { t } = useTranslation();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      return data;
    },
  });

  const agencyName = profile?.agency_name || "Pinnacle CRM";
  const logoUrl = profile?.logo_url;

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-sidebar-border">
        {logoUrl ? (
          <img src={logoUrl} alt={agencyName} className="h-9 w-9 rounded-md object-contain bg-white" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent">
            <Briefcase className="h-5 w-5 text-accent-foreground" />
          </div>
        )}
        <div>
          <div className="text-base font-bold tracking-tight">{agencyName}</div>
          <div className="text-[11px] text-sidebar-foreground/60 uppercase tracking-wider">Agency Edition</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((it) => {
          const Icon = it.icon;
          const active = isActive(it.to, it.exact);
          return (
            <Link
              key={it.to}
              href={it.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-foreground border-l-2 border-accent"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {t(it.labelKey)}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4 space-y-3">
        <div className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4 mr-2" /> {t("nav.signOut")}
        </Button>
      </div>
    </div>
  );
}

export function AppShell({ children, title }: { children: React.ReactNode; title: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col fixed inset-y-0 left-0 z-30">
        <SidebarNav />
      </aside>

      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 h-16 px-4 lg:px-8 border-b bg-card/90 backdrop-blur">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
          <div className="ml-auto flex items-center gap-1">
            <LanguageSwitcher />
            <NotificationBell />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
