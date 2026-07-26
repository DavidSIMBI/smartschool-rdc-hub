import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { StudentShell } from "@/components/dashboard/StudentShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/dashboard/student/settings")({ component: SettingsPage });

function SettingsPage() {
  const { theme, toggle } = useTheme();
  const { lang, setLang } = useI18n();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);

  async function updatePassword() {
    if (pw.length < 8) return toast.error("Minimum 8 caractères");
    if (pw !== pw2) return toast.error("Les mots de passe ne correspondent pas");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (error) return toast.error(error.message);
    setPw(""); setPw2("");
    toast.success("Mot de passe mis à jour");
  }

  return (
    <StudentShell title="Paramètres" subtitle="Préférences personnelles">
      <div className="grid gap-6 max-w-2xl">
        <section className="rounded-2xl border border-border bg-background/70 backdrop-blur-sm p-5">
          <h3 className="font-semibold mb-4">Apparence</h3>
          <div className="flex gap-2">
            <Button variant={theme === "light" ? "default" : "outline"} size="sm" onClick={() => theme === "dark" && toggle()}>Clair</Button>
            <Button variant={theme === "dark" ? "default" : "outline"} size="sm" onClick={() => theme === "light" && toggle()}>Sombre</Button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-background/70 backdrop-blur-sm p-5">
          <h3 className="font-semibold mb-4">Langue</h3>
          <div className="flex gap-2">
            <Button variant={lang === "fr" ? "default" : "outline"} size="sm" onClick={() => setLang("fr")}>Français</Button>
            <Button variant={lang === "en" ? "default" : "outline"} size="sm" onClick={() => setLang("en")}>English</Button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-background/70 backdrop-blur-sm p-5 space-y-3">
          <h3 className="font-semibold">Changer le mot de passe</h3>
          <div className="space-y-2">
            <Label>Nouveau mot de passe</Label>
            <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Confirmer</Label>
            <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </div>
          <Button onClick={updatePassword} disabled={saving}>{saving ? "Mise à jour…" : "Mettre à jour"}</Button>
        </section>
      </div>
    </StudentShell>
  );
}