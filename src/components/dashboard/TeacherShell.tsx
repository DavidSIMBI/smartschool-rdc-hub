import { type ReactNode } from "react";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  FileText,
  NotebookPen,
  FolderOpen,
  GraduationCap,
  Library,
  MessageSquare,
  CalendarDays,
  Clock,
  Megaphone,
  Bell,
  UserRound,
  LogOut,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/site/Logo";
import { LangThemeToggle } from "@/components/site/LangThemeToggle";
import { useAuth } from "@/lib/auth-context";
import { MobileNavDrawer } from "@/components/dashboard/MobileNavDrawer";

interface NavItem { to: string; label: string; icon: LucideIcon }

export const teacherNav: NavItem[] = [
  { to: "/dashboard/teacher", label: "Vue d'ensemble", icon: LayoutDashboard },
  { to: "/dashboard/teacher/classes", label: "Mes classes", icon: Users },
  { to: "/dashboard/teacher/subjects", label: "Mes matières", icon: BookOpen },
  { to: "/dashboard/teacher/timetable", label: "Emploi du temps", icon: Clock },
  { to: "/dashboard/teacher/attendance", label: "Présences", icon: CalendarCheck },
  { to: "/dashboard/teacher/assignments", label: "Devoirs", icon: ClipboardList },
  { to: "/dashboard/teacher/grading", label: "Corrections", icon: GraduationCap },
  { to: "/dashboard/teacher/exams", label: "Examens & notes", icon: FileText },
  { to: "/dashboard/teacher/lesson-plans", label: "Plans de leçon", icon: NotebookPen },
  { to: "/dashboard/teacher/resources", label: "Ressources", icon: Library },
  { to: "/dashboard/teacher/documents", label: "Documents", icon: FolderOpen },
  { to: "/dashboard/teacher/announcements", label: "Annonces", icon: Megaphone },
  { to: "/dashboard/teacher/messages", label: "Messages", icon: MessageSquare },
  { to: "/dashboard/teacher/calendar", label: "Calendrier", icon: CalendarDays },
  { to: "/dashboard/teacher/notifications", label: "Notifications", icon: Bell },
  { to: "/dashboard/teacher/profile", label: "Profil", icon: UserRound },
];

export function TeacherShell({
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

  return (
    <div className="min-h-screen flex bg-secondary/30 overflow-x-hidden">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-background/80 backdrop-blur-sm">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <Logo />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-primary bg-primary/10 rounded-md px-2 py-0.5">
            Prof
          </span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {teacherNav.map((n) => {
            const active = loc.pathname === n.to || (n.to !== "/dashboard/teacher" && loc.pathname.startsWith(n.to));
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
            <MobileNavDrawer nav={teacherNav} badge="Prof" rootPath="/dashboard/teacher" />
            <div className="min-w-0">
              <h1 className="truncate text-base sm:text-lg font-semibold">{title}</h1>
              {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
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

export function TeacherStatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "danger";
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
        </div>
        <div className={`grid h-11 w-11 place-items-center rounded-xl ${toneCls} transition-transform group-hover:scale-110`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function TeacherAccessDenied() {
  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <div className="max-w-md text-center rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-elegant)]">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-500/10 text-red-500">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">Accès réservé aux enseignants</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cet espace est destiné aux enseignants d'une école inscrite. Contactez votre
          directeur d'école pour obtenir l'accès.
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