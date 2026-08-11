import { type ReactNode, useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  UserRound,
  BookOpen,
  ClipboardList,
  FileText,
  Award,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Megaphone,
  MessageSquare,
  Bell,
  FolderOpen,
  Library,
  Sparkles,
  Settings,
  LogOut,
  ShieldAlert,
  Search,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/site/Logo";
import { LangThemeToggle } from "@/components/site/LangThemeToggle";
import { useAuth } from "@/lib/auth-context";
import { MobileNavDrawer } from "@/components/dashboard/MobileNavDrawer";

interface NavItem { to: string; label: string; icon: LucideIcon }

export const studentNav: NavItem[] = [
  { to: "/dashboard/student", label: "Vue d'ensemble", icon: LayoutDashboard },
  { to: "/dashboard/student/profile", label: "Mon profil", icon: UserRound },
  { to: "/dashboard/student/subjects", label: "Mes matières", icon: BookOpen },
  { to: "/dashboard/student/assignments", label: "Devoirs", icon: ClipboardList },
  { to: "/dashboard/student/materials", label: "Ressources", icon: FolderOpen },
  { to: "/dashboard/student/resources", label: "Bibliothèque LMS", icon: Library },
  { to: "/dashboard/student/exams", label: "Examens", icon: FileText },
  { to: "/dashboard/student/report-card", label: "Bulletin", icon: Award },
  { to: "/dashboard/student/attendance", label: "Présence", icon: CalendarCheck },
  { to: "/dashboard/student/timetable", label: "Emploi du temps", icon: CalendarDays },
  { to: "/dashboard/student/calendar", label: "Calendrier", icon: CalendarRange },
  { to: "/dashboard/student/announcements", label: "Annonces", icon: Megaphone },
  { to: "/dashboard/student/messages", label: "Messages", icon: MessageSquare },
  { to: "/dashboard/student/notifications", label: "Notifications", icon: Bell },
  { to: "/dashboard/student/assistant", label: "Assistant IA", icon: Sparkles },
  { to: "/dashboard/student/settings", label: "Paramètres", icon: Settings },
];

export function StudentShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [q, setQ] = useState("");

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    navigate({ to: "/dashboard/student/search", search: { q: query } });
  };

  return (
    <div className="min-h-screen flex bg-secondary/30 overflow-x-hidden">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-background/80 backdrop-blur-sm">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <Logo />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-primary bg-primary/10 rounded-md px-2 py-0.5">
            Élève
          </span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {studentNav.map((n) => {
            const active = loc.pathname === n.to || (n.to !== "/dashboard/student" && loc.pathname.startsWith(n.to));
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  active
                    ? "bg-primary/10 text-primary font-medium shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
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
        <header className="min-h-16 flex flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-8 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex min-w-0 items-center gap-3">
            <MobileNavDrawer
              nav={studentNav}
              badge="Élève"
              rootPath="/dashboard/student"
              extra={
                <form onSubmit={onSearch} className="relative">
                  <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Rechercher…"
                    aria-label="Recherche globale"
                    className="h-11 pl-8"
                  />
                </form>
              }
            />
            <div className="min-w-0">
              <h1 className="truncate text-base sm:text-lg font-semibold">{title}</h1>
              {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <form onSubmit={onSearch} className="hidden md:flex relative">
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher…"
                aria-label="Recherche globale"
                className="pl-8 h-9 w-48 lg:w-64"
              />
            </form>
            {actions}
            <span className="hidden lg:inline text-sm text-muted-foreground">{user?.email}</span>
            <LangThemeToggle />
          </div>
        </header>
        <main className="flex-1 min-w-0 p-4 sm:p-8 overflow-x-hidden animate-in fade-in duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}

export function StudentStatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "danger";
  hint?: string;
}) {
  const toneCls =
    tone === "success"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : tone === "warning"
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      : tone === "danger"
      ? "bg-red-500/10 text-red-600 dark:text-red-400"
      : "bg-primary/10 text-primary";
  return (
    <div className="group rounded-2xl border border-border bg-background/70 backdrop-blur-sm p-5 shadow-[var(--shadow-soft)] transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
        </div>
        <div className={`grid h-11 w-11 place-items-center rounded-xl ${toneCls} transition-transform group-hover:scale-110`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function StudentAccessDenied() {
  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <div className="max-w-md text-center rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-elegant)]">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-500/10 text-red-500">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">Accès refusé</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cet espace est réservé aux élèves inscrits d'une école partenaire. Contactez le secrétariat
          de votre école pour obtenir vos identifiants.
        </p>
        <div className="mt-6">
          <Link
            to="/auth/login"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}