import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessDenied } from "@/components/super-admin/SuperAdminShell";

export const Route = createFileRoute("/dashboard/super-admin")({
  head: () => ({
    meta: [
      { title: "Super Admin — SmartSchool RDC" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SuperAdminLayout,
});

function SuperAdminLayout() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth/login" });
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="animate-pulse text-sm text-muted-foreground">
          Chargement…
        </div>
      </div>
    );
  }
  if (!user) return null;
  if (!roles.includes("super_admin")) return <AccessDenied />;
  return <Outlet />;
}