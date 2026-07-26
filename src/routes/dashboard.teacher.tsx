import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Users, ClipboardList } from "lucide-react";
import { DashboardShell, StatCard } from "@/components/dashboard/DashboardShell";

export const Route = createFileRoute("/dashboard/teacher")({
  head: () => ({
    meta: [
      { title: "Espace enseignant — SmartSchool RDC" },
      { name: "description", content: "Consultez vos classes, matières et élèves assignés, et gérez vos activités pédagogiques quotidiennes." },
      { property: "og:title", content: "Espace enseignant — SmartSchool RDC" },
      { property: "og:description", content: "Vos classes, matières et élèves dans un espace dédié aux enseignants." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <DashboardShell title="Espace enseignant" subtitle="Vos classes et matières">
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Mes classes" value={0} icon={ClipboardList} />
        <StatCard label="Mes matières" value={0} icon={BookOpen} />
        <StatCard label="Mes élèves" value={0} icon={Users} />
      </div>
      <div className="mt-6 rounded-2xl border border-border bg-background p-6">
        <p className="text-sm text-muted-foreground">Bienvenue. Les données seront disponibles lorsque votre directeur vous aura assigné à des classes.</p>
      </div>
    </DashboardShell>
  ),
});