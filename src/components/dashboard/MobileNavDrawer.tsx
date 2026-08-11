import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Menu, LogOut, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/site/Logo";
import { useAuth } from "@/lib/auth-context";

export interface MobileNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Mobile-only navigation drawer. Renders a hamburger button on small screens
 * and an overlay drawer with the exact same nav items the desktop sidebar
 * shows for the current role (so role permissions are unchanged).
 */
export function MobileNavDrawer({
  nav,
  badge,
  rootPath,
  extra,
}: {
  nav: MobileNavItem[];
  badge?: string;
  rootPath?: string;
  extra?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  // Lock background scroll while the drawer is open (iOS friendly).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
        aria-expanded={open}
        className="lg:hidden inline-flex h-11 min-w-11 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-medium active:scale-[0.98] transition"
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only sm:not-sr-only">Menu</span>
      </button>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50 animate-in fade-in"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="relative z-10 flex h-full w-[84%] max-w-80 flex-col border-r border-border bg-background shadow-xl animate-in slide-in-from-left duration-200"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border p-4">
              <div className="flex min-w-0 items-center gap-2">
                <Logo />
                {badge && (
                  <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
                    {badge}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {extra && <div className="border-b border-border p-4">{extra}</div>}

            <nav
              className="flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-4"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {nav.map((n) => {
                const active =
                  rootPath && n.to === rootPath
                    ? loc.pathname === n.to
                    : loc.pathname === n.to || loc.pathname.startsWith(`${n.to}/`);
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors ${
                      active
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <n.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{n.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-border p-3">
              {user?.email && (
                <p className="mb-2 truncate px-1 text-xs text-muted-foreground">{user.email}</p>
              )}
              <Button
                variant="ghost"
                className="h-11 w-full justify-start gap-3"
                onClick={async () => {
                  setOpen(false);
                  await signOut();
                  navigate({ to: "/auth/login" });
                }}
              >
                <LogOut className="h-4 w-4" /> Déconnexion
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}