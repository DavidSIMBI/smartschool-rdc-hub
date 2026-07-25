import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Database, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SuperAdminShell } from "@/components/super-admin/SuperAdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { triggerBackup, updatePlatformSettings } from "@/lib/super-admin.functions";

export const Route = createFileRoute("/dashboard/super-admin/settings")({
  head: () => ({ meta: [{ title: "Paramètres — Super Admin" }, { name: "robots", content: "noindex" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const update = useServerFn(updatePlatformSettings);
  const backup = useServerFn(triggerBackup);

  const { data } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("*").limit(1).maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState<any>(null);
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (!form) return <SuperAdminShell title="Paramètres"><div /></SuperAdminShell>;

  const save = async () => {
    try {
      await update({
        data: {
          platform_name: form.platform_name,
          support_email: form.support_email ?? "",
          default_locale: form.default_locale,
          default_theme: form.default_theme,
          notifications_enabled: form.notifications_enabled,
          backups_enabled: form.backups_enabled,
          backup_frequency: form.backup_frequency,
        },
      });
      toast.success("Paramètres enregistrés");
      qc.invalidateQueries({ queryKey: ["platform-settings"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    }
  };

  return (
    <SuperAdminShell title="Paramètres plateforme" subtitle="Configuration globale de SmartSchool RDC">
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Général">
          <Field label="Nom de la plateforme">
            <Input value={form.platform_name} onChange={(e) => setForm({ ...form, platform_name: e.target.value })} />
          </Field>
          <Field label="URL du logo">
            <Input value={form.logo_url ?? ""} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
          </Field>
          <Field label="Email de support">
            <Input value={form.support_email ?? ""} onChange={(e) => setForm({ ...form, support_email: e.target.value })} />
          </Field>
        </Panel>

        <Panel title="Apparence & langues">
          <Field label="Langue par défaut">
            <Select value={form.default_locale} onValueChange={(v) => setForm({ ...form, default_locale: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Thème par défaut">
            <Select value={form.default_theme} onValueChange={(v) => setForm({ ...form, default_theme: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Clair</SelectItem>
                <SelectItem value="dark">Sombre</SelectItem>
                <SelectItem value="system">Système</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </Panel>

        <Panel title="Notifications & sécurité">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">Notifications activées</div>
              <div className="text-xs text-muted-foreground">Envoi de notifications système</div>
            </div>
            <Switch
              checked={!!form.notifications_enabled}
              onCheckedChange={(v) => setForm({ ...form, notifications_enabled: v })}
            />
          </div>
          <div className="text-xs text-muted-foreground pt-3 border-t border-border">
            RLS activé sur toutes les tables · Audit logs actifs · Auth sécurisée
          </div>
        </Panel>

        <Panel title="Sauvegarde base de données">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">Sauvegardes automatiques</div>
              <div className="text-xs text-muted-foreground">Fréquence : {form.backup_frequency}</div>
            </div>
            <Switch
              checked={!!form.backups_enabled}
              onCheckedChange={(v) => setForm({ ...form, backups_enabled: v })}
            />
          </div>
          <Field label="Fréquence">
            <Select value={form.backup_frequency} onValueChange={(v) => setForm({ ...form, backup_frequency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Toutes les heures</SelectItem>
                <SelectItem value="daily">Quotidienne</SelectItem>
                <SelectItem value="weekly">Hebdomadaire</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Button
            variant="outline"
            className="gap-2"
            onClick={async () => {
              try {
                await backup({});
                toast.success("Sauvegarde lancée");
              } catch (e: any) {
                toast.error(e?.message ?? "Erreur");
              }
            }}
          >
            <Database className="h-4 w-4" /> Lancer une sauvegarde maintenant
          </Button>
        </Panel>
      </div>

      <div className="mt-6">
        <Button onClick={save} className="gap-2"><Save className="h-4 w-4" /> Enregistrer</Button>
      </div>
    </SuperAdminShell>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5 shadow-[var(--shadow-soft)] space-y-4">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}