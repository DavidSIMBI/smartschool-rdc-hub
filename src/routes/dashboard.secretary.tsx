import { createFileRoute } from "@tanstack/react-router";
import { Users, ClipboardList, Megaphone } from "lucide-react";
import { DashboardShell, StatCard } from "@/components/dashboard/DashboardShell";

export const Route = createFileRoute("/dashboard/secretary")({
  head: () => ({
    meta: [
      { title: "Secrétariat — SmartSchool RDC" },
      { name: "description", content: "Gérez inscriptions, classes et communications de l'école depuis l'espace secrétariat." },
      { property: "og:title", content: "Secrétariat — SmartSchool RDC" },
      { property: "og:description", content: "Inscriptions, classes et annonces pour le personnel administratif." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <DashboardShell title="Secrétariat">
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Inscriptions" value={0} icon={Users} />
        <StatCard label="Classes" value={0} icon={ClipboardList} />
        <StatCard label="Annonces" value={0} icon={Megaphone} />
      </div>
    </DashboardShell>
  ),
});