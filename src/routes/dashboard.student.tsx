import { createFileRoute } from "@tanstack/react-router";
import { FileText, CalendarCheck, Megaphone } from "lucide-react";
import { DashboardShell, StatCard } from "@/components/dashboard/DashboardShell";

export const Route = createFileRoute("/dashboard/student")({
  head: () => ({
    meta: [
      { title: "Espace élève — SmartSchool RDC" },
      { name: "description", content: "Suivez votre moyenne, votre présence et les annonces de votre école depuis votre espace élève." },
      { property: "og:title", content: "Espace élève — SmartSchool RDC" },
      { property: "og:description", content: "Moyenne, présence et annonces : votre scolarité au quotidien." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <DashboardShell title="Espace élève" subtitle="Bienvenue">
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Moyenne" value="—" icon={FileText} />
        <StatCard label="Présence" value="—" icon={CalendarCheck} />
        <StatCard label="Annonces" value={0} icon={Megaphone} />
      </div>
    </DashboardShell>
  ),
});