import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Users, GraduationCap } from "lucide-react";
import { DashboardShell, StatCard } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard/super-admin")({
  head: () => ({ meta: [{ title: "Super Admin — SmartSchool RDC" }, { name: "robots", content: "noindex" }] }),
  component: SuperAdmin,
});

function SuperAdmin() {
  const [stats, setStats] = useState({ schools: 0, students: 0, teachers: 0 });
  useEffect(() => {
    (async () => {
      const [a, b, c] = await Promise.all([
        supabase.from("schools").select("*", { count: "exact", head: true }),
        supabase.from("students").select("*", { count: "exact", head: true }),
        supabase.from("teachers").select("*", { count: "exact", head: true }),
      ]);
      setStats({ schools: a.count ?? 0, students: b.count ?? 0, teachers: c.count ?? 0 });
    })();
  }, []);
  return (
    <DashboardShell title="Plateforme SmartSchool" subtitle="Vue Super Admin">
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Écoles" value={stats.schools} icon={Building2} />
        <StatCard label="Élèves" value={stats.students} icon={Users} />
        <StatCard label="Enseignants" value={stats.teachers} icon={GraduationCap} />
      </div>
    </DashboardShell>
  );
}