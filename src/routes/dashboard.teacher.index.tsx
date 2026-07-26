import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  FileText,
  Mail,
  Sparkles,
  Plus,
} from "lucide-react";
import { TeacherShell, TeacherStatCard } from "@/components/dashboard/TeacherShell";
import { getTeacherOverview } from "@/lib/teacher.functions";

export const Route = createFileRoute("/dashboard/teacher/")({
  head: () => ({ meta: [{ title: "Vue d'ensemble — Enseignant" }, { name: "robots", content: "noindex" }] }),
  component: TeacherHome,
});

function TeacherHome() {
  const fetchOverview = useServerFn(getTeacherOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["teacher", "overview"],
    queryFn: () => fetchOverview(),
  });

  const stats = data?.stats;
  const teacher = data?.teacher;
  const school = data?.school;

  return (
    <TeacherShell
      title={teacher ? `Bonjour, ${teacher.first_name}` : "Espace enseignant"}
      subtitle={school ? `${school.name} — ${school.city}` : "Cockpit pédagogique"}
    >
      {!teacher && !isLoading && (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 mb-6 text-sm">
          Votre profil enseignant n'est pas encore lié à ce compte. Contactez votre
          administrateur pour finaliser l'assignation.
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TeacherStatCard label="Mes classes" value={stats?.classes ?? 0} icon={Users} />
        <TeacherStatCard label="Mes matières" value={stats?.subjects ?? 0} icon={BookOpen} tone="success" />
        <TeacherStatCard label="Mes élèves" value={stats?.students ?? 0} icon={Users} />
        <TeacherStatCard label="Présences aujourd'hui" value={stats?.attendanceToday ?? 0} icon={CalendarCheck} tone="warning" />
        <TeacherStatCard label="Devoirs actifs" value={stats?.assignments ?? 0} icon={ClipboardList} />
        <TeacherStatCard label="Examens à corriger" value={stats?.examsToGrade ?? 0} icon={FileText} tone="warning" />
        <TeacherStatCard label="Messages non lus" value={stats?.unreadMessages ?? 0} icon={Mail} tone="danger" />
        <TeacherStatCard label="Cours du jour" value={stats?.lessonsToday ?? 0} icon={CalendarCheck} tone="success" />
      </div>

      <div className="mt-8 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-background p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Devoirs récents</h2>
            <Link to="/dashboard/teacher/assignments" className="text-sm text-primary hover:underline">
              Tout voir →
            </Link>
          </div>
          {(data?.assignments ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun devoir encore. Créez-en un pour vos élèves.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data!.assignments.map((a: any) => (
                <li key={a.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{a.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.due_date ? `Échéance : ${new Date(a.due_date).toLocaleDateString("fr-FR")}` : "Sans échéance"}
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{a.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-background to-background p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="grid place-items-center h-9 w-9 rounded-xl bg-primary/15 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-semibold">Actions rapides</h2>
          </div>
          <div className="space-y-2">
            <QuickAction to="/dashboard/teacher/attendance" label="Prendre les présences" icon={CalendarCheck} />
            <QuickAction to="/dashboard/teacher/assignments" label="Nouveau devoir" icon={Plus} />
            <QuickAction to="/dashboard/teacher/exams" label="Saisir des notes" icon={FileText} />
            <QuickAction to="/dashboard/teacher/lesson-plans" label="Plan de leçon" icon={BookOpen} />
            <QuickAction to="/dashboard/teacher/messages" label="Envoyer un message" icon={Mail} />
          </div>
        </div>
      </div>
    </TeacherShell>
  );
}

function QuickAction({ to, label, icon: Icon }: { to: string; label: string; icon: any }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-background/60 border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-sm"
    >
      <Icon className="h-4 w-4 text-primary" />
      {label}
    </Link>
  );
}