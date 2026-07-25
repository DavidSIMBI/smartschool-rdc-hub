import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "school_admin" | "secretary" | "accountant" | "teacher" | "student" | "parent";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  schoolId: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadRoles(s.user.id), 0);
      } else {
        setRoles([]);
        setSchoolId(null);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) loadRoles(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadRoles(uid: string) {
    const [{ data: rs }, { data: p }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("profiles").select("school_id").eq("id", uid).maybeSingle(),
    ]);
    setRoles((rs ?? []).map((r: { role: AppRole }) => r.role));
    setSchoolId(p?.school_id ?? null);
  }

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        roles,
        schoolId,
        loading,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}

export function dashboardPathFor(roles: AppRole[]): string {
  if (roles.includes("super_admin")) return "/dashboard/super-admin";
  if (roles.includes("school_admin")) return "/dashboard/admin";
  if (roles.includes("teacher")) return "/dashboard/teacher";
  if (roles.includes("secretary")) return "/dashboard/secretary";
  if (roles.includes("accountant")) return "/dashboard/accountant";
  if (roles.includes("student")) return "/dashboard/student";
  return "/dashboard/admin";
}