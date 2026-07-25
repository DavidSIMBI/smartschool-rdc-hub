import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Users,
  GraduationCap,
  UserCog,
  Sparkles,
  Wallet,
  Clock,
  Activity,
  DollarSign,
  Bell,
  Megaphone,
  Database,
  Plus,
  FileText,
  ShieldCheck,
  Settings,
  BadgeCheck,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { SuperAdminShell, StatCard } from "@/components/super-admin/SuperAdminShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/super-admin/")({
  head: () => ({
    meta: [
      { title: "Vue d'ensemble — Super Admin — SmartSchool RDC" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Overview,
});

function fmtMoney(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "USD" });
}

function Overview() {
  const { data } = useQuery({
    queryKey: ["super-admin", "overview"],
    queryFn: async () => {
      const [schools, students, teachers, staff, subs, payments, notifs, activity, since30] =
        await Promise.all([
          supabase.from("schools").select("id, status, created_at, province"),
          supabase.from("students").select("id, created_at", { count: "exact", head: true }),
          supabase.from("teachers").select("id", { count: "exact", head: true }),
          supabase.from("user_roles").select("id", { count: "exact", head: true }),
          supabase.from("subscriptions").select("school_id, plan, status, monthly_price"),
          supabase.from("payments").select("amount, status, paid_at, created_at"),
          supabase
            .from("notifications")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(6),
          supabase
            .from("activity_logs")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("schools")
            .select("id", { count: "exact", head: true })
            .gte("created_at", new Date(Date.now() - 30 * 864e5).toISOString()),
        ]);
      return {
        schools: schools.data ?? [],
        studentsCount: students.count ?? 0,
        teachersCount: teachers.count ?? 0,
        staffCount: staff.count ?? 0,
        subs: subs.data ?? [],
        payments: payments.data ?? [],
        notifs: notifs.data ?? [],
        activity: activity.data ?? [],
        newSchools30d: since30.count ?? 0,
      };
    },
  });

  const schools = data?.schools ?? [];
  const active = schools.filter((s: any) => s.status === "active").length;
  const pending = schools.filter((s: any) => s.status === "pending").length;
  const suspended = schools.filter((s: any) => s.status === "suspended").length;

  // Monthly revenue chart from paid payments in the last 12 months
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("fr-FR", { month: "short" }),
      revenue: 0,
      registrations: 0,
    };
  });
  (data?.payments ?? []).forEach((p: any) => {
    if (p.status !== "paid" || !p.paid_at) return;
    const d = new Date(p.paid_at);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = months.find((m) => m.key === k);
    if (bucket) bucket.revenue += Number(p.amount);
  });
  schools.forEach((s: any) => {
    if (!s.created_at) return;
    const d = new Date(s.created_at);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = months.find((m) => m.key === k);
    if (bucket) bucket.registrations += 1;
  });

  // Cumulative school growth
  let cum = 0;
  const growth = months.map((m) => {
    cum += m.registrations;
    return { label: m.label, total: cum };
  });

  // Schools by province (top 5)
  const provinceMap = new Map<string, number>();
  schools.forEach((s: any) =>
    provinceMap.set(s.province, (provinceMap.get(s.province) ?? 0) + 1),
  );
  const provinceData = Array.from(provinceMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const pieColors = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6"];

  // MRR
  const mrr = (data?.subs ?? [])
    .filter((s: any) => s.status === "active")
    .reduce((sum: number, s: any) => sum + Number(s.monthly_price ?? 0), 0);

  const pendingPayments = (data?.payments ?? []).filter(
    (p: any) => p.status === "pending",
  ).length;

  const monthlyRevenue = months[months.length - 1]?.revenue ?? 0;

  return (
    <SuperAdminShell
      title="Plateforme SmartSchool RDC"
      subtitle="Tableau de contrôle du propriétaire"
      actions={
        <Link to="/dashboard/super-admin/schools">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Nouvelle école
          </Button>
        </Link>
      }
    >
      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Écoles totales" value={schools.length} icon={Building2} />
        <StatCard label="Écoles actives" value={active} icon={BadgeCheck} tone="success" />
        <StatCard label="Élèves" value={data?.studentsCount ?? 0} icon={Users} />
        <StatCard label="Enseignants" value={data?.teachersCount ?? 0} icon={GraduationCap} />
        <StatCard label="Personnel total" value={data?.staffCount ?? 0} icon={UserCog} />
        <StatCard
          label="Nouvelles (30j)"
          value={data?.newSchools30d ?? 0}
          icon={Sparkles}
          hint="Inscriptions ce mois-ci"
        />
        <StatCard label="Revenu ce mois" value={fmtMoney(monthlyRevenue)} icon={DollarSign} tone="success" />
        <StatCard label="MRR estimé" value={fmtMoney(mrr)} icon={Wallet} tone="success" />
        <StatCard label="Paiements en attente" value={pendingPayments} icon={Clock} tone="warning" />
        <StatCard label="Système" value="Opérationnel" icon={Activity} tone="success" hint="Tous les services OK" />
      </div>

      {/* Charts */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-background p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Revenu mensuel</h2>
              <p className="text-xs text-muted-foreground">12 derniers mois (USD)</p>
            </div>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={months}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v: number) => fmtMoney(v)} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background p-5 shadow-[var(--shadow-soft)]">
          <h2 className="font-semibold">Écoles par province</h2>
          <p className="text-xs text-muted-foreground">Répartition top 6</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={provinceData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {provinceData.map((_, i) => (
                    <Cell key={i} fill={pieColors[i % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background p-5 shadow-[var(--shadow-soft)]">
          <h2 className="font-semibold">Croissance des écoles</h2>
          <p className="text-xs text-muted-foreground">Cumul sur 12 mois</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growth}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-background p-5 shadow-[var(--shadow-soft)]">
          <h2 className="font-semibold">Nouvelles inscriptions</h2>
          <p className="text-xs text-muted-foreground">Écoles inscrites par mois</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="registrations" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-6 rounded-2xl border border-border bg-background p-5 shadow-[var(--shadow-soft)]">
        <h2 className="font-semibold">Actions rapides</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { to: "/dashboard/super-admin/schools", icon: Plus, label: "Ajouter une école" },
            { to: "/dashboard/super-admin/schools", icon: BadgeCheck, label: "Approuver des écoles" },
            { to: "/dashboard/super-admin/announcements", icon: Megaphone, label: "Envoyer une annonce" },
            { to: "/dashboard/super-admin/payments", icon: FileText, label: "Générer un rapport" },
            { to: "/dashboard/super-admin/subscriptions", icon: Wallet, label: "Gérer les abonnements" },
            { to: "/dashboard/super-admin/payments", icon: DollarSign, label: "Voir les paiements" },
            { to: "/dashboard/super-admin/settings", icon: Database, label: "Sauvegarde base de données" },
            { to: "/dashboard/super-admin/settings", icon: Settings, label: "Paramètres plateforme" },
          ].map((a) => (
            <Link
              key={a.label}
              to={a.to}
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <a.icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Notifications + activity */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2"><Bell className="h-4 w-4" /> Centre de notifications</h2>
            <Link to="/dashboard/super-admin/notifications" className="text-xs text-primary hover:underline">Tout voir</Link>
          </div>
          <ul className="mt-4 space-y-3">
            {(data?.notifs ?? []).map((n: any) => (
              <li key={n.id} className="flex gap-3 rounded-lg border border-border p-3 text-sm">
                <span
                  className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                    n.severity === "success"
                      ? "bg-emerald-500"
                      : n.severity === "warning"
                      ? "bg-amber-500"
                      : n.severity === "critical"
                      ? "bg-red-500"
                      : "bg-primary"
                  }`}
                />
                <div className="min-w-0">
                  <div className="font-medium truncate">{n.title}</div>
                  <div className="text-xs text-muted-foreground">{n.message}</div>
                </div>
              </li>
            ))}
            {(data?.notifs ?? []).length === 0 && (
              <li className="text-sm text-muted-foreground">Aucune notification pour l'instant.</li>
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-background p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2"><Activity className="h-4 w-4" /> Activité récente</h2>
            <Link to="/dashboard/super-admin/audit" className="text-xs text-primary hover:underline">Audit</Link>
          </div>
          <ul className="mt-4 space-y-3">
            {(data?.activity ?? []).map((a: any) => (
              <li key={a.id} className="flex justify-between gap-3 text-sm border-b border-border pb-2 last:border-0">
                <div className="min-w-0">
                  <div className="font-medium truncate">{a.action}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {a.actor_name ?? "Système"} · {a.target_type ?? "—"}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">
                  {new Date(a.created_at).toLocaleString("fr-FR")}
                </div>
              </li>
            ))}
            {(data?.activity ?? []).length === 0 && (
              <li className="text-sm text-muted-foreground">Aucune activité récente.</li>
            )}
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border p-6 text-primary-foreground shadow-[var(--shadow-elegant)]" style={{ background: "var(--gradient-hero)" }}>
        <div className="flex items-start gap-4">
          <ShieldCheck className="h-6 w-6" />
          <div>
            <h3 className="font-semibold">Sécurité & isolation multi-tenant</h3>
            <p className="mt-1 text-sm opacity-90 max-w-3xl">
              Chaque école dispose de son propre espace isolé. En tant que Super Admin, vous êtes
              le seul à pouvoir traverser les tenants. Toutes vos actions sensibles sont
              enregistrées dans le journal d'audit.
            </p>
          </div>
        </div>
      </div>
    </SuperAdminShell>
  );
}