import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList, FileText, BookOpen, CalendarCheck, MessageSquare, Megaphone,
  Award, Sparkles, FolderOpen, CalendarDays, TrendingUp, GraduationCap,
} from "lucide-react";
import { StudentShell, StudentStatCard } from "@/components/dashboard/StudentShell";
import { getStudentOverview } from "@/lib/student.functions";

export const Route = createFileRoute("/dashboard/student/")({
  component: StudentHome,
});

function StudentHome() {
  const { data, isLoading } = useQuery({
    queryKey: ["student-overview"],
    queryFn: () => getStudentOverview(),
  });

  const s = data?.stats;
  const st = data?.student;
  const school = data?.school;
  const klass = data?.klass;
  const fullName = st ? `${st.first_name} ${st.last_name}` : "—";
  const initials = st ? `${st.first_name?.[0] ?? ""}${st.last_name?.[0] ?? ""}`.toUpperCase() : "?";
  const term = new Date().getMonth() < 4 ? "Trimestre 2" : new Date().getMonth() < 8 ? "Trimestre 3" : "Trimestre 1";

  return (
    <StudentShell title="Vue d'ensemble" subtitle={fullName}>
      {/* Hero identity card */}
      <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-background to-background p-6 shadow-[var(--shadow-elegant)] mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex items-center gap-4">
            {st?.photo_url ? (
              <img src={st.photo_url} alt={fullName} className="h-20 w-20 rounded-2xl object-cover border-2 border-primary/30" />
            ) : (
              <div className="h-20 w-20 rounded-2xl grid place-items-center bg-primary/15 text-primary text-2xl font-bold border-2 border-primary/30">
                {initials}
              </div>
            )}
            <div>
              <div className="text-xs uppercase tracking-widest text-primary font-semibold">Bienvenue</div>
              <h2 className="text-2xl font-bold">{isLoading ? "…" : fullName}</h2>
              <p className="text-sm text-muted-foreground">
                Matricule: <span className="font-mono">{st?.matricule ?? "—"}</span>
              </p>
            </div>
          </div>
          <div className="md:ml-auto grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <InfoTile label="Classe" value={klass?.name ?? "—"} />
            <InfoTile label="Année" value={klass?.academic_year ?? "—"} />
            <InfoTile label="Période" value={term} />
            <InfoTile label="École" value={school?.name ?? "—"} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StudentStatCard label="Présence" value={`${s?.attendancePct ?? 0}%`} icon={CalendarCheck} tone="success" hint={`${s?.present ?? 0}/${s?.totalDays ?? 0} jours`} />
        <StudentStatCard label="Moyenne" value={s ? `${s.avg}%` : "—"} icon={TrendingUp} tone="primary" />
        <StudentStatCard label="Matières" value={s?.subjects ?? 0} icon={BookOpen} />
        <StudentStatCard label="Devoirs en attente" value={s?.pending ?? 0} icon={ClipboardList} tone="warning" />
        <StudentStatCard label="Devoirs rendus" value={s?.completed ?? 0} icon={GraduationCap} tone="success" />
        <StudentStatCard label="Examens à venir" value={s?.upcomingExams ?? 0} icon={FileText} />
        <StudentStatCard label="Messages non lus" value={s?.unreadMessages ?? 0} icon={MessageSquare} tone="warning" />
        <StudentStatCard label="Annonces" value={s?.announcements ?? 0} icon={Megaphone} />
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Actions rapides</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <QuickAction to="/dashboard/student/assignments" icon={ClipboardList} label="Devoirs" />
          <QuickAction to="/dashboard/student/materials" icon={FolderOpen} label="Ressources" />
          <QuickAction to="/dashboard/student/report-card" icon={Award} label="Bulletin" />
          <QuickAction to="/dashboard/student/timetable" icon={CalendarDays} label="Emploi du temps" />
          <QuickAction to="/dashboard/student/messages" icon={MessageSquare} label="Message" />
          <QuickAction to="/dashboard/student/assistant" icon={Sparkles} label="Assistant IA" />
        </div>
      </div>
    </StudentShell>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/70 backdrop-blur-sm px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold truncate">{value}</div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link
      to={to}
      className="group rounded-2xl border border-border bg-background/70 backdrop-blur-sm p-4 flex flex-col items-start gap-2 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40"
    >
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-sm font-medium">{label}</div>
    </Link>
  );
}