import { type ReactNode } from "react";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Wallet,
  Bell,
  Megaphone,
  ShieldCheck,
  Settings,
  LogOut,
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

export const superAdminNav: NavItem[] = [
  { to: "/dashboard/super-admin", label: "Vue d'ensemble", icon: LayoutDashboard },
  { to: "/dashboard/super-admin/schools", label: "Écoles", icon: Building2 },
  { to: "/dashboard/super-admin/subscriptions", label: "Abonnements", icon: CreditCard },
  { to: "/dashboard/super-admin/payments", label: "Paiements", icon: Wallet },
  { to: "/dashboard/super-admin/notifications", label: "Notifications", icon: Bell },
  { to: "/dashboard/super-admin/announcements", label: "Annonces", icon: Megaphone },
  { to: "/dashboard/super-admin/audit", label: "Audit & sécurité", icon: ShieldCheck },
  { to: "/dashboard/super-admin/settings", label: "Paramètres", icon: Settings },
];

export function SuperAdminShell({
  title,
  subtitle,
  actions,
  children,
  search,
  onSearchChange,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  search?: string;
  onSearchChange?: (v: string) => void;
}) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  return (
    <div className="min-h-screen flex bg-secondary/30 overflow-x-hidden">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-background">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <Logo />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-primary bg-primary/10 rounded-md px-2 py-0.5">
            Super
          </span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {superAdminNav.map((n) => {
            const active =
              n.to === "/dashboard/super-admin"
                ? loc.pathname === n.to
                : loc.pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-primary/10 text-primary font-medium"
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
        <header className="min-h-16 flex flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-8 border-b border-border bg-background sticky top-0 z-20">
          <div className="flex min-w-0 items-center gap-3">
            <MobileNavDrawer
              nav={superAdminNav}
              badge="Super"
              rootPath="/dashboard/super-admin"
              extra={
                onSearchChange ? (
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search ?? ""}
                      onChange={(e) => onSearchChange(e.target.value)}
                      placeholder="Rechercher…"
                      className="h-11 pl-9"
                    />
                  </div>
                ) : undefined
              }
            />
            <div className="min-w-0">
              <h1 className="truncate text-base sm:text-lg font-semibold">{title}</h1>
              {subtitle && (
                <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {onSearchChange && (
              <div className="relative hidden md:block">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search ?? ""}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Rechercher…"
                  className="pl-9 w-64"
                />
              </div>
            )}
            {actions}
            <span className="hidden xl:inline text-sm text-muted-foreground">
              {user?.email}
            </span>
            <LangThemeToggle />
          </div>
        </header>
        <main className="flex-1 min-w-0 p-4 sm:p-8 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
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
    <div className="rounded-2xl border border-border bg-background p-5 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
        </div>
        <div className={`grid h-11 w-11 place-items-center rounded-xl ${toneCls}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function AccessDenied() {
  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <div className="max-w-md text-center rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-elegant)]">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-500/10 text-red-500">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">Accès refusé</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette section est réservée au propriétaire de la plateforme SmartSchool RDC.
          Si vous pensez qu'il s'agit d'une erreur, contactez l'administrateur.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link
            to="/"
            className="inline-flex items-center rounded-md border border-input px-4 py-2 text-sm hover:bg-accent"
          >
            Accueil
          </Link>
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