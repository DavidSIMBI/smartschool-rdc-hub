import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TeacherAccessDenied } from "@/components/dashboard/TeacherShell";

function TeacherLayout() {
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "ok" | "denied">("loading");

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate({ to: "/auth/login" });
        return;
      }
      const [{ data: roles }, { data: teacherRow }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("teachers").select("id").eq("user_id", user.id).maybeSingle(),
      ]);
      if (cancel) return;
      const hasRole = (roles ?? []).some((r) =>
        r.role === "teacher" || r.role === "school_admin" || r.role === "super_admin",
      );
      setState(hasRole || teacherRow ? "ok" : "denied");
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
  if (state === "denied") return <TeacherAccessDenied />;
  return <Outlet />;
}

export const Route = createFileRoute("/dashboard/teacher")({
  head: () => ({
    meta: [
      { title: "Espace enseignant — SmartSchool RDC" },
      { name: "description", content: "Cockpit enseignant : classes, présences, devoirs, examens, plans de leçon, messages et calendrier." },
      { property: "og:title", content: "Espace enseignant — SmartSchool RDC" },
      { property: "og:description", content: "Cockpit enseignant : classes, présences, devoirs, examens et messages." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TeacherLayout,
});