import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Logo } from "@/components/site/Logo";
import { LangThemeToggle } from "@/components/site/LangThemeToggle";
import { SUPER_ADMIN_EMAIL } from "@/lib/super-admin.constants";

export const Route = createFileRoute("/auth/register")({
  head: () => ({
    meta: [
      { title: "Inscription école — SmartSchool RDC" },
      { name: "description", content: "Créez l'espace de votre école sur SmartSchool RDC en quelques minutes." },
      { property: "og:title", content: "Inscription école — SmartSchool RDC" },
      { property: "og:description", content: "Inscrivez votre école sur SmartSchool RDC." },
    ],
  }),
  component: RegisterPage,
});

const PROVINCES = [
  "Kinshasa", "Kongo-Central", "Kwango", "Kwilu", "Mai-Ndombe", "Équateur",
  "Mongala", "Nord-Ubangi", "Sud-Ubangi", "Tshuapa", "Tshopo", "Bas-Uele",
  "Haut-Uele", "Ituri", "Nord-Kivu", "Sud-Kivu", "Maniema", "Tanganyika",
  "Haut-Katanga", "Haut-Lomami", "Lualaba", "Lomami", "Kasaï", "Kasaï-Central",
  "Kasaï-Oriental", "Sankuru",
];

function RegisterPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    school_name: "",
    province: PROVINCES[0],
    city: "",
    address: "",
    phone: "",
    email: "",
    principal_name: "",
    password: "",
  });

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.email.trim().toLowerCase() === SUPER_ADMIN_EMAIL) {
      toast.error("Cette adresse est réservée à l'administrateur de la plateforme.");
      return;
    }
    setLoading(true);
    try {
      const { data: signUp, error: signErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/login`,
          data: { full_name: form.principal_name },
        },
      });
      if (signErr) throw signErr;
      const userId = signUp.user?.id;
      if (!userId) throw new Error("Signup failed");

      const { data: school, error: schoolErr } = await supabase
        .from("schools")
        .insert({
          name: form.school_name,
          province: form.province,
          city: form.city,
          address: form.address,
          phone: form.phone,
          email: form.email,
          principal_name: form.principal_name,
        })
        .select()
        .single();
      if (schoolErr) throw schoolErr;

      await supabase.from("profiles").upsert({
        id: userId,
        school_id: school.id,
        full_name: form.principal_name,
        email: form.email,
        phone: form.phone,
      });

      await supabase.from("user_roles").insert({
        user_id: userId,
        role: "school_admin",
        school_id: school.id,
      });

      toast.success("École créée avec succès !");
      navigate({ to: "/dashboard/admin" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <aside className="hidden lg:flex flex-col justify-between p-10 text-primary-foreground relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <Logo className="text-primary-foreground" />
        <div className="relative z-10">
          <h2 className="text-4xl font-bold leading-tight">Votre école, dans le cloud.</h2>
          <p className="mt-4 text-primary-foreground/90 max-w-md">
            Créez votre espace en 2 minutes. Espace de travail, base de données et compte administrateur sont générés automatiquement.
          </p>
        </div>
        <div className="text-sm text-primary-foreground/80">© {new Date().getFullYear()} SmartSchool RDC</div>
      </aside>
      <main className="p-6 sm:p-10 flex flex-col">
        <div className="flex justify-between items-center mb-8">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← {t("nav.contact") && "Accueil"}</Link>
          <LangThemeToggle />
        </div>
        <Card className="p-6 sm:p-8 max-w-lg w-full mx-auto flex-1 flex flex-col justify-center">
          <h1 className="text-2xl font-bold">{t("auth.register.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("auth.register.subtitle")}</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="school_name">{t("auth.school_name")}</Label>
              <Input id="school_name" required value={form.school_name} onChange={(e) => update("school_name", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="province">{t("auth.province")}</Label>
                <select
                  id="province"
                  value={form.province}
                  onChange={(e) => update("province", e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="city">{t("auth.city")}</Label>
                <Input id="city" required value={form.city} onChange={(e) => update("city", e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="address">{t("auth.address")}</Label>
              <Input id="address" value={form.address} onChange={(e) => update("address", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="phone">{t("auth.phone")}</Label>
                <Input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input id="email" type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="principal_name">{t("auth.principal")}</Label>
              <Input id="principal_name" required value={form.principal_name} onChange={(e) => update("principal_name", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input id="password" type="password" required minLength={6} value={form.password} onChange={(e) => update("password", e.target.value)} />
            </div>
            <Button type="submit" className="w-full shadow-[var(--shadow-elegant)]" disabled={loading}>
              {loading ? "..." : t("auth.submit")}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              {t("auth.have_account")} <Link to="/auth/login" className="text-primary font-medium">{t("auth.signin_link")}</Link>
            </p>
          </form>
        </Card>
      </main>
    </div>
  );
}