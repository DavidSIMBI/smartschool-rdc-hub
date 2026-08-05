import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/site/Logo";
import { LangThemeToggle } from "@/components/site/LangThemeToggle";

export const Route = createFileRoute("/auth/reset-password")({
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — SmartSchool RDC" },
      { name: "description", content: "Définissez un nouveau mot de passe pour votre compte SmartSchool RDC." },
      { property: "og:title", content: "Nouveau mot de passe — SmartSchool RDC" },
      { property: "og:description", content: "Choisissez un nouveau mot de passe SmartSchool RDC." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"checking" | "valid" | "invalid">("checking");
  const [tokenError, setTokenError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    const fail = (msg: string) => {
      if (cancelled) return;
      setTokenError(msg);
      setStatus("invalid");
    };

    (async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const query = new URLSearchParams(window.location.search);

      // Supabase reports expired/consumed links via error params.
      const errCode = hash.get("error_code") || query.get("error_code");
      const errDesc = hash.get("error_description") || query.get("error_description");
      if (errCode || errDesc) {
        const expired = /expired/i.test(`${errCode} ${errDesc}`);
        return fail(
          expired
            ? "Ce lien de réinitialisation a expiré. Les liens sont valables 1 heure. Demandez un nouveau lien."
            : "Ce lien de réinitialisation est invalide ou a déjà été utilisé. Demandez un nouveau lien.",
        );
      }

      const access_token = hash.get("access_token");
      const refresh_token = hash.get("refresh_token");
      const type = hash.get("type") || query.get("type");
      const code = query.get("code");

      // Expiry check on the token itself before trying to use it.
      const expiresAt = Number(hash.get("expires_at") || 0);
      if (expiresAt && expiresAt * 1000 < Date.now()) {
        return fail("Ce lien de réinitialisation a expiré. Demandez un nouveau lien.");
      }

      if (access_token && refresh_token) {
        if (type && type !== "recovery") {
          return fail("Ce lien n'est pas un lien de réinitialisation de mot de passe.");
        }
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) {
          return fail("Ce lien de réinitialisation est invalide ou a expiré. Demandez un nouveau lien.");
        }
        window.history.replaceState(null, "", window.location.pathname);
        if (!cancelled) setStatus("valid");
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          return fail("Ce lien de réinitialisation est invalide ou a expiré. Demandez un nouveau lien.");
        }
        window.history.replaceState(null, "", window.location.pathname);
        if (!cancelled) setStatus("valid");
        return;
      }

      // No token in the URL: only allow if a recovery session is already active.
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        return fail("Lien de réinitialisation manquant ou expiré. Demandez un nouveau lien depuis la page « Mot de passe oublié ».");
      }
      if (!cancelled) setStatus("valid");
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status !== "valid") return;
    if (pw.length < 8) return toast.error("Minimum 8 caractères");
    if (pw !== pw2) return toast.error("Les mots de passe ne correspondent pas");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (error) {
      if (/session|jwt|expired|token/i.test(error.message)) {
        setTokenError("Votre session de réinitialisation a expiré. Demandez un nouveau lien.");
        setStatus("invalid");
        return;
      }
      return toast.error(error.message);
    }
    await supabase.auth.signOut();
    toast.success("Mot de passe mis à jour");
    navigate({ to: "/auth/login" });
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <aside className="hidden lg:flex flex-col justify-between p-10 text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
        <Logo className="text-primary-foreground" />
        <div>
          <h2 className="text-4xl font-bold leading-tight">Nouveau départ.</h2>
          <p className="mt-4 text-primary-foreground/90 max-w-md">Choisissez un mot de passe solide pour protéger votre espace.</p>
        </div>
        <div className="text-sm text-primary-foreground/80">© {new Date().getFullYear()} SmartSchool RDC</div>
      </aside>
      <main className="p-6 sm:p-10 flex flex-col">
        <div className="flex justify-between items-center mb-8">
          <Link to="/auth/login" className="text-sm text-muted-foreground hover:text-foreground">← Connexion</Link>
          <LangThemeToggle />
        </div>
        <Card className="p-6 sm:p-8 max-w-md w-full mx-auto flex-1 flex flex-col justify-center">
          <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
          {status === "checking" ? (
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Vérification du lien…
            </div>
          ) : status === "invalid" ? (
            <div className="mt-6 space-y-4">
              <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm flex gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
                <span>{tokenError}</span>
              </div>
              <Button asChild className="w-full shadow-[var(--shadow-elegant)]">
                <Link to="/auth/forgot-password">Demander un nouveau lien</Link>
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                <Link to="/auth/login" className="text-primary font-medium">Retour à la connexion</Link>
              </p>
            </div>
          ) : (
          <>
          <p className="mt-1 text-sm text-muted-foreground">Minimum 8 caractères.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="pw">Nouveau mot de passe</Label>
              <div className="relative">
                <Input id="pw" type={show ? "text" : "password"} required value={pw} onChange={(e) => setPw(e.target.value)} className="pr-10" />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  aria-pressed={show}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="pw2">Confirmer</Label>
              <Input id="pw2" type={show ? "text" : "password"} required value={pw2} onChange={(e) => setPw2(e.target.value)} />
            </div>
            <Button type="submit" className="w-full shadow-[var(--shadow-elegant)]" disabled={saving}>
              {saving ? "..." : "Mettre à jour"}
            </Button>
          </form>
          </>
          )}
        </Card>
      </main>
    </div>
  );
}
