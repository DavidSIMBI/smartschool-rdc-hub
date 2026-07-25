import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { dashboardPathFor, type AppRole } from "@/lib/auth-context";
import { Logo } from "@/components/site/Logo";
import { LangThemeToggle } from "@/components/site/LangThemeToggle";

export const Route = createFileRoute("/auth/login")({
  head: () => ({
    meta: [
      { title: "Connexion — SmartSchool RDC" },
      { name: "description", content: "Connectez-vous à SmartSchool RDC pour accéder à votre tableau de bord." },
      { property: "og:title", content: "Connexion — SmartSchool RDC" },
      { property: "og:description", content: "Accès à votre espace SmartSchool." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const uid = data.user?.id;
      if (!uid) throw new Error("Login failed");
      const { data: rs } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      const roles = (rs ?? []).map((r: { role: AppRole }) => r.role);
      toast.success("Bienvenue !");
      navigate({ to: dashboardPathFor(roles) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <aside className="hidden lg:flex flex-col justify-between p-10 text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
        <Logo className="text-primary-foreground" />
        <div>
          <h2 className="text-4xl font-bold leading-tight">Content de vous revoir.</h2>
          <p className="mt-4 text-primary-foreground/90 max-w-md">
            Retrouvez vos élèves, vos classes et vos rapports en un instant.
          </p>
        </div>
        <div className="text-sm text-primary-foreground/80">© {new Date().getFullYear()} SmartSchool RDC</div>
      </aside>
      <main className="p-6 sm:p-10 flex flex-col">
        <div className="flex justify-between items-center mb-8">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Accueil</Link>
          <LangThemeToggle />
        </div>
        <Card className="p-6 sm:p-8 max-w-md w-full mx-auto flex-1 flex flex-col justify-center">
          <h1 className="text-2xl font-bold">{t("auth.login.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("auth.login.subtitle")}</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full shadow-[var(--shadow-elegant)]" disabled={loading}>
              {loading ? "..." : t("auth.login.submit")}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              {t("auth.no_account")} <Link to="/auth/register" className="text-primary font-medium">{t("auth.signup_link")}</Link>
            </p>
          </form>
        </Card>
      </main>
    </div>
  );
}