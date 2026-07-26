import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, GraduationCap, ClipboardList, Megaphone } from "lucide-react";
import { DashboardShell, StatCard } from "@/components/dashboard/DashboardShell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard/admin")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — SmartSchool RDC" },
      { name: "description", content: "Espace administrateur de votre école : suivez élèves, enseignants, classes et annonces en temps réel." },
      { property: "og:title", content: "Tableau de bord administrateur — SmartSchool RDC" },
      { property: "og:description", content: "Pilotez votre école : élèves, enseignants, classes, présences et annonces en un seul espace sécurisé." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { user, loading, schoolId } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ students: 0, teachers: 0, classes: 0, announcements: 0 });
  const [school, setSchool] = useState<{ name: string; city: string; province: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      const [s, t, c, a, sch] = await Promise.all([
        supabase.from("students").select("*", { count: "exact", head: true }).eq("school_id", schoolId),
        supabase.from("teachers").select("*", { count: "exact", head: true }).eq("school_id", schoolId),
        supabase.from("classes").select("*", { count: "exact", head: true }).eq("school_id", schoolId),
        supabase.from("announcements").select("*", { count: "exact", head: true }).eq("school_id", schoolId),
        supabase.from("schools").select("name, city, province").eq("id", schoolId).maybeSingle(),
      ]);
      setStats({
        students: s.count ?? 0,
        teachers: t.count ?? 0,
        classes: c.count ?? 0,
        announcements: a.count ?? 0,
      });
      if (sch.data) setSchool(sch.data);
    })();
  }, [schoolId]);

  return (
    <DashboardShell
      title={school ? school.name : "Tableau de bord"}
      subtitle={school ? `${school.city}, ${school.province}` : "Bienvenue"}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Élèves" value={stats.students} icon={Users} />
        <StatCard label="Enseignants" value={stats.teachers} icon={GraduationCap} />
        <StatCard label="Classes" value={stats.classes} icon={ClipboardList} />
        <StatCard label="Annonces" value={stats.announcements} icon={Megaphone} />
      </div>

      <div className="mt-8 grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-background p-6 shadow-[var(--shadow-soft)]">
          <h2 className="font-semibold">Bienvenue sur SmartSchool RDC</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Votre espace de gestion scolaire est prêt. Commencez par ajouter des classes,
            puis inscrivez vos enseignants et élèves.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Créer les classes de l'année</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Ajouter les enseignants</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Inscrire les élèves</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Publier votre première annonce</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-border p-6 text-primary-foreground shadow-[var(--shadow-elegant)]" style={{ background: "var(--gradient-hero)" }}>
          <h3 className="font-semibold">Sécurité & isolation</h3>
          <p className="mt-2 text-sm opacity-90">
            Les données de votre école sont totalement isolées. Aucune autre école ne peut y accéder.
          </p>
        </div>
      </div>
    </DashboardShell>
  );
}