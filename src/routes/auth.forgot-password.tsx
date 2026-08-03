import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/site/Logo";
import { LangThemeToggle } from "@/components/site/LangThemeToggle";

export const Route = createFileRoute("/auth/forgot-password")({
  head: () => ({
    meta: [
      { title: "Mot de passe oublié — SmartSchool RDC" },
      { name: "description", content: "Réinitialisez le mot de passe de votre compte SmartSchool RDC en toute sécurité." },
      { property: "og:title", content: "Mot de passe oublié — SmartSchool RDC" },
      { property: "og:description", content: "Recevez un lien de réinitialisation de mot de passe SmartSchool RDC." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPasswordPage,
});

const GENERIC = "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.";
const emailSchema = z.string().trim().email().max(255);

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) return toast.error("Adresse email invalide");
    setLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(parsed.data.toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
    } catch {
      // Never reveal whether the account exists.
    } finally {
      setLoading(false);
      setSent(true);
      toast.success(GENERIC);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <aside className="hidden lg:flex flex-col justify-between p-10 text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
        <Logo className="text-primary-foreground" />
        <div>
          <h2 className="text-4xl font-bold leading-tight">Mot de passe oublié ?</h2>
          <p className="mt-4 text-primary-foreground/90 max-w-md">
            Pas d'inquiétude. Indiquez votre email et nous vous enverrons un lien de réinitialisation.
          </p>
        </div>
        <div className="text-sm text-primary-foreground/80">© {new Date().getFullYear()} SmartSchool RDC</div>
      </aside>
      <main className="p-6 sm:p-10 flex flex-col">
        <div className="flex justify-between items-center mb-8">
          <Link to="/auth/login" className="text-sm text-muted-foreground hover:text-foreground">← Connexion</Link>
          <LangThemeToggle />
        </div>
        <Card className="p-6 sm:p-8 max-w-md w-full mx-auto flex-1 flex flex-col justify-center">
          <h1 className="text-2xl font-bold">Réinitialiser le mot de passe</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Saisissez l'adresse email associée à votre compte.
          </p>
          {sent ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">{GENERIC}</div>
              <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
                Renvoyer un lien
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                <Link to="/auth/login" className="text-primary font-medium">Retour à la connexion</Link>
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="email">Adresse email</Label>
                <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button type="submit" className="w-full shadow-[var(--shadow-elegant)]" disabled={loading}>
                {loading ? "..." : "Envoyer le lien"}
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                <Link to="/auth/login" className="text-primary font-medium">Retour à la connexion</Link>
              </p>
            </form>
          )}
        </Card>
      </main>
    </div>
  );
}
