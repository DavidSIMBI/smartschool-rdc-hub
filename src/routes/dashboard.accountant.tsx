import { createFileRoute } from "@tanstack/react-router";
import { Wallet, FileText, Users } from "lucide-react";
import { DashboardShell, StatCard } from "@/components/dashboard/DashboardShell";

export const Route = createFileRoute("/dashboard/accountant")({
  head: () => ({ meta: [{ title: "Comptabilité — SmartSchool RDC" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <DashboardShell title="Comptabilité">
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Frais collectés" value="$0" icon={Wallet} />
        <StatCard label="Impayés" value="$0" icon={FileText} />
        <StatCard label="Élèves" value={0} icon={Users} />
      </div>
    </DashboardShell>
  ),
});