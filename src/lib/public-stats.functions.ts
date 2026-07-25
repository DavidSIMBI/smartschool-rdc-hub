import { createServerFn } from "@tanstack/react-start";

export const getPublicStats = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [schools, students, teachers, admins] = await Promise.all([
    supabaseAdmin.from("schools").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("students").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("teachers").select("*", { count: "exact", head: true }),
    supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "school_admin"),
  ]);
  return {
    schools: schools.count ?? 0,
    students: students.count ?? 0,
    teachers: teachers.count ?? 0,
    admins: admins.count ?? 0,
  };
});