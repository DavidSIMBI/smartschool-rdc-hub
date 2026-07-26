import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StudentAccessDenied } from "@/components/dashboard/StudentShell";

function StudentLayout() {
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "ok" | "denied">("loading");

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate({ to: "/auth/login" }); return; }
      const [{ data: roles }, { data: studentRow }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("students").select("id").eq("user_id", user.id).maybeSingle(),
      ]);
      if (cancel) return;
      const hasRole = (roles ?? []).some((r) =>
        r.role === "student" || r.role === "school_admin" || r.role === "super_admin",
      );
      setState(hasRole || studentRow ? "ok" : "denied");
    })();
    return () => { cancel = true; };
  }, [navigate]);

  if (state === "loading") {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (state === "denied") return <StudentAccessDenied />;
  return <Outlet />;
}

export const Route = createFileRoute("/dashboard/student")({
  head: () => ({
    meta: [
      { title: "Espace élève — SmartSchool RDC" },
      { name: "description", content: "Cockpit élève : profil, matières, devoirs, examens, bulletin, présences, emploi du temps et assistant IA." },
      { property: "og:title", content: "Espace élève — SmartSchool RDC" },
      { property: "og:description", content: "Suivez votre scolarité : devoirs, notes, bulletin et assistant IA." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentLayout,
});