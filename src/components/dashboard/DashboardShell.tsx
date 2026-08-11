import { type ReactNode } from "react";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarCheck,
  ClipboardList,
  FileText,
  Wallet,
  Clock,
  Megaphone,
  Bell,
  Settings,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/site/Logo";
import { LangThemeToggle } from "@/components/site/LangThemeToggle";
import { useAuth } from "@/lib/auth-context";
import { MobileNavDrawer } from "@/components/dashboard/MobileNavDrawer";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const commonNav: NavItem[] = [
  { to: "/dashboard/admin", label: "Vue d'ensemble", icon: LayoutDashboard },
  { to: "/dashboard/students", label: "Élèves", icon: Users },
  { to: "/dashboard/teachers", label: "Enseignants", icon: GraduationCap },
  { to: "/dashboard/classes", label: "Classes", icon: ClipboardList },
  { to: "/dashboard/attendance", label: "Présences", icon: CalendarCheck },
  { to: "/dashboard/exams", label: "Examens", icon: FileText },
  { to: "/dashboard/fees", label: "Frais", icon: Wallet },
  { to: "/dashboard/timetable", label: "Emploi du temps", icon: Clock },
  { to: "/dashboard/announcements", label: "Annonces", icon: Megaphone },
  { to: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { to: "/dashboard/settings", label: "Paramètres", icon: Settings },
];

export function DashboardShell({ title, subtitle, nav = commonNav, children }: { title: string; subtitle?: string; nav?: NavItem[]; children: ReactNode }) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();

  return (
    <div className="min-h-screen flex bg-secondary/30 overflow-x-hidden">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-background">
        <div className="p-5 border-b border-border">
          <Logo />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((n) => {
            const active = loc.pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={async () => {
              await signOut();
              navigate({ to: "/auth/login" });
            }}
          >
            <LogOut className="h-4 w-4" /> Déconnexion
          </Button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="min-h-16 flex flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-8 border-b border-border bg-background sticky top-0 z-20">
          <div className="flex min-w-0 items-center gap-3">
            <MobileNavDrawer nav={nav} badge="Admin" rootPath="/dashboard/admin" />
            <div className="min-w-0">
              <h1 className="truncate text-base sm:text-lg font-semibold">{title}</h1>
              {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="hidden lg:inline text-sm text-muted-foreground">{user?.email}</span>
            <LangThemeToggle />
          </div>
        </header>
        <main className="flex-1 min-w-0 p-4 sm:p-8 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, hint }: { label: string; value: string | number; icon: LucideIcon; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
          {hint && <div className="mt-1 text-xs text-primary">{hint}</div>}
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}