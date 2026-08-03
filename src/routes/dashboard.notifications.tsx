import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Bell,
  BellOff,
  Check,
  Megaphone,
  Users,
  GraduationCap,
  CalendarCheck,
  FileText,
  Wallet,
  Clock,
  Settings,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Panel, StatusBadge } from "@/components/dashboard/admin-kit";
import { Button } from "@/components/ui/button";
import { listAdminNotifications, setNotificationRead, markAllNotificationsRead } from "@/lib/admin.functions";

export const Route = createFileRoute("/dashboard/notifications")({
  head: () => ({
    meta: [
      { title: "Centre de notifications — SmartSchool RDC" },
      { name: "description", content: "Suivez les alertes de votre école, marquez-les lues ou non lues et accédez directement au module concerné." },
      { property: "og:title", content: "Centre de notifications — SmartSchool RDC" },
      { property: "og:description", content: "Alertes, annonces et accès rapide aux modules de gestion scolaire." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotificationsCenterPage,
});

type Target = { to: string; label: string; icon: LucideIcon };

const TARGETS: Record<string, Target> = {
  student: { to: "/dashboard/students", label: "Élèves", icon: Users },
  students: { to: "/dashboard/students", label: "Élèves", icon: Users },
  enrollment: { to: "/dashboard/students", label: "Élèves", icon: Users },
  teacher: { to: "/dashboard/teachers", label: "Enseignants", icon: GraduationCap },
  teachers: { to: "/dashboard/teachers", label: "Enseignants", icon: GraduationCap },
  attendance: { to: "/dashboard/attendance", label: "Présences", icon: CalendarCheck },
  exam: { to: "/dashboard/exams", label: "Examens", icon: FileText },
  exams: { to: "/dashboard/exams", label: "Examens", icon: FileText },
  results: { to: "/dashboard/exams", label: "Examens", icon: FileText },
  fee: { to: "/dashboard/fees", label: "Frais", icon: Wallet },
  fees: { to: "/dashboard/fees", label: "Frais", icon: Wallet },
  payment: { to: "/dashboard/fees", label: "Frais", icon: Wallet },
  timetable: { to: "/dashboard/timetable", label: "Emploi du temps", icon: Clock },
  announcement: { to: "/dashboard/announcements", label: "Annonces", icon: Megaphone },
  class: { to: "/dashboard/classes", label: "Classes", icon: FileText },
  settings: { to: "/dashboard/settings", label: "Paramètres", icon: Settings },
  subscription: { to: "/dashboard/settings", label: "Paramètres", icon: Settings },
};

const FALLBACK: Target = { to: "/dashboard/admin", label: "Vue d'ensemble", icon: Bell };

function targetFor(n: { type?: string | null; title?: string | null; message?: string | null }): Target {
  const key = (n.type ?? "").toLowerCase();
  if (TARGETS[key]) return TARGETS[key];
  const hay = `${n.title ?? ""} ${n.message ?? ""}`.toLowerCase();
  const found = Object.keys(TARGETS).find((k) => hay.includes(k));
  return found ? TARGETS[found]! : FALLBACK;
}

const dotFor = (s?: string | null) =>
  s === "success"
    ? "bg-emerald-500"
    : s === "warning"
    ? "bg-amber-500"
    : s === "critical"
    ? "bg-red-500"
    : "bg-primary";

const QUICK_LINKS: Target[] = [
  { to: "/dashboard/students", label: "Élèves", icon: Users },
  { to: "/dashboard/teachers", label: "Enseignants", icon: GraduationCap },
  { to: "/dashboard/attendance", label: "Présences", icon: CalendarCheck },
  { to: "/dashboard/exams", label: "Examens", icon: FileText },
  { to: "/dashboard/fees", label: "Frais", icon: Wallet },
  { to: "/dashboard/timetable", label: "Emploi du temps", icon: Clock },
  { to: "/dashboard/announcements", label: "Annonces", icon: Megaphone },
  { to: "/dashboard/settings", label: "Paramètres", icon: Settings },
];

function NotificationsCenterPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAdminNotifications);
  const readFn = useServerFn(setNotificationRead);
  const allFn = useServerFn(markAllNotificationsRead);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const { data, isLoading } = useQuery({ queryKey: ["admin", "notifications"], queryFn: () => listFn() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "notifications"] });

  const toggle = useMutation({
    mutationFn: (v: { id: string; read: boolean }) => readFn({ data: v }),
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });
  const markAll = useMutation({
    mutationFn: () => allFn(),
    onSuccess: () => { toast.success("Toutes les notifications sont marquées lues"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const notifs = (data?.notifications ?? []) as any[];
  const anns = (data?.announcements ?? []) as any[];
  const unread = data?.unread ?? 0;
  const rows = notifs.filter((n) => (filter === "all" ? true : filter === "unread" ? !n.read : n.read));

  return (
    <DashboardShell title="Notifications & annonces" subtitle="Centre d'alertes de l'établissement">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Panel
            title={`${unread} non lue(s) · ${notifs.length} au total`}
            actions={
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-border p-0.5">
                  {(["all", "unread", "read"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                        filter === f ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {f === "all" ? "Toutes" : f === "unread" ? "Non lues" : "Lues"}
                    </button>
                  ))}
                </div>
                <Button size="sm" variant="outline" className="gap-2" disabled={unread === 0 || markAll.isPending} onClick={() => markAll.mutate()}>
                  <Check className="h-4 w-4" /> Tout marquer lu
                </Button>
              </div>
            }
          >
            {isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Chargement…</p>}
            {!isLoading && rows.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-10 text-center">
                <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">Aucune notification à afficher.</p>
              </div>
            )}
            <ul className="space-y-2">
              {rows.map((n) => {
                const t = targetFor(n);
                return (
                  <li
                    key={n.id}
                    className={`flex gap-3 rounded-xl border p-4 ${n.read ? "border-border bg-background opacity-80" : "border-primary/30 bg-primary/5"}`}
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotFor(n.severity)}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h3 className={`text-sm ${n.read ? "font-medium" : "font-semibold"}`}>{n.title}</h3>
                          {!n.read && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Nouveau</span>}
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("fr-FR")}</span>
                      </div>
                      {n.message && <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Link
                          to={t.to}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                        >
                          <t.icon className="h-3.5 w-3.5" /> Ouvrir {t.label} <ArrowRight className="h-3 w-3" />
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1.5 px-2 text-xs"
                          disabled={toggle.isPending}
                          onClick={() => toggle.mutate({ id: n.id, read: !n.read })}
                        >
                          {n.read ? <><BellOff className="h-3.5 w-3.5" /> Marquer non lue</> : <><Check className="h-3.5 w-3.5" /> Marquer lue</>}
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel
            title="Annonces récentes"
            actions={
              <Link to="/dashboard/announcements" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                Gérer les annonces <ArrowRight className="h-3 w-3" />
              </Link>
            }
          >
            {anns.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Aucune annonce publiée.</p>
            ) : (
              <ul className="space-y-2">
                {anns.slice(0, 8).map((a) => (
                  <li key={a.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Megaphone className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{a.title}</span>
                        <StatusBadge value={a.status} />
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {new Date(a.publish_at ?? a.created_at).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    {a.body && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.body}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">Audience : {a.audience ?? "tous"}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <Panel title="Accès rapide aux modules" className="h-fit">
          <div className="grid grid-cols-2 gap-2">
            {QUICK_LINKS.map((q) => (
              <Link
                key={q.to}
                to={q.to}
                className="flex flex-col gap-2 rounded-xl border border-border p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <q.icon className="h-4 w-4" />
                </span>
                <span className="text-xs font-medium">{q.label}</span>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </DashboardShell>
  );
}