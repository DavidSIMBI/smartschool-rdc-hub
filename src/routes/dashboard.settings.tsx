import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Panel, Field, fileToBase64 } from "@/components/dashboard/admin-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getSchoolSettings, updateSchoolSettings, uploadSchoolFile } from "@/lib/admin.functions";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({
    meta: [
      { title: "Paramètres de l'école — SmartSchool RDC" },
      { name: "description", content: "Configurez le logo, la devise, les couleurs, le cachet, la signature et l'année académique de votre école." },
      { property: "og:title", content: "Paramètres de l'école — SmartSchool RDC" },
      { property: "og:description", content: "Identité, coordonnées, branding et configuration académique de votre établissement." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

const sel = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

function SettingsPage() {
  const qc = useQueryClient();
  const getFn = useServerFn(getSchoolSettings);
  const saveFn = useServerFn(updateSchoolSettings);
  const uploadFn = useServerFn(uploadSchoolFile);

  const { data } = useQuery({ queryKey: ["admin", "school-settings"], queryFn: () => getFn() });
  const [f, setF] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setF(data); }, [data]);

  const save = useMutation({
    mutationFn: () => saveFn({
      data: {
        name: f.name ?? "", motto: f.motto ?? "", address: f.address ?? "",
        province: f.province ?? "", territory: f.territory ?? "", city: f.city ?? "",
        phone: f.phone ?? "", email: f.email ?? "", website: f.website ?? "",
        facebook: f.facebook ?? "", whatsapp: f.whatsapp ?? "", principal_name: f.principal_name ?? "",
        logo_url: f.logo_url ?? "", cover_url: f.cover_url ?? "", stamp_url: f.stamp_url ?? "", signature_url: f.signature_url ?? "",
        primary_color: f.primary_color ?? "", secondary_color: f.secondary_color ?? "", accent_color: f.accent_color ?? "",
        academic_year: f.academic_year ?? "", current_term: f.current_term ?? "",
        locale: f.locale ?? "fr", currency: f.currency ?? "CDF", timezone: f.timezone ?? "Africa/Kinshasa",
      },
    }),
    onSuccess: () => { toast.success("Paramètres enregistrés"); qc.invalidateQueries({ queryKey: ["admin", "school-settings"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  async function upload(file: File, key: string) {
    setBusy(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await uploadFn({ data: { folder: "branding", fileName: file.name, contentType: file.type, base64 } });
      setF((p: any) => ({ ...p, [key]: res.url }));
      toast.success("Fichier téléversé");
    } catch (e: any) { toast.error(e?.message ?? "Échec du téléversement"); }
    finally { setBusy(false); }
  }

  if (!f) return <DashboardShell title="Paramètres de l'école"><p className="text-sm text-muted-foreground">Chargement…</p></DashboardShell>;

  const imgField = (label: string, key: string, accept = "image/*") => (
    <Field label={label}>
      <div className="flex items-center gap-3">
        {f[key] && <img src={f[key]} alt={label} className="h-12 w-12 rounded object-contain" />}
        <input type="file" accept={accept} disabled={busy} className="text-sm" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], key)} />
      </div>
    </Field>
  );

  return (
    <DashboardShell title="Paramètres de l'école" subtitle="Identité, branding et configuration académique">
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Identité">
          <div className="space-y-4">
            <Field label="Nom de l'école"><Input value={f.name ?? ""} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Devise / Motto"><Textarea rows={2} value={f.motto ?? ""} onChange={(e) => setF({ ...f, motto: e.target.value })} /></Field>
            <Field label="Nom du directeur"><Input value={f.principal_name ?? ""} onChange={(e) => setF({ ...f, principal_name: e.target.value })} /></Field>
          </div>
        </Panel>

        <Panel title="Coordonnées">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Province"><Input value={f.province ?? ""} onChange={(e) => setF({ ...f, province: e.target.value })} /></Field>
            <Field label="Ville"><Input value={f.city ?? ""} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
            <Field label="Territoire"><Input value={f.territory ?? ""} onChange={(e) => setF({ ...f, territory: e.target.value })} /></Field>
            <Field label="Téléphone"><Input value={f.phone ?? ""} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
            <Field label="Email"><Input value={f.email ?? ""} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
            <Field label="Site web"><Input value={f.website ?? ""} onChange={(e) => setF({ ...f, website: e.target.value })} /></Field>
            <Field label="Facebook"><Input value={f.facebook ?? ""} onChange={(e) => setF({ ...f, facebook: e.target.value })} /></Field>
            <Field label="WhatsApp"><Input value={f.whatsapp ?? ""} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} /></Field>
          </div>
          <div className="mt-4">
            <Field label="Adresse"><Textarea rows={2} value={f.address ?? ""} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
          </div>
        </Panel>

        <Panel title="Branding">
          <div className="space-y-4">
            {imgField("Logo", "logo_url")}
            {imgField("Image de couverture", "cover_url")}
            {imgField("Cachet officiel", "stamp_url")}
            {imgField("Signature du directeur", "signature_url")}
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Couleur primaire"><Input type="color" value={f.primary_color ?? "#059669"} onChange={(e) => setF({ ...f, primary_color: e.target.value })} /></Field>
              <Field label="Couleur secondaire"><Input type="color" value={f.secondary_color ?? "#0f172a"} onChange={(e) => setF({ ...f, secondary_color: e.target.value })} /></Field>
              <Field label="Couleur d'accent"><Input type="color" value={f.accent_color ?? "#f59e0b"} onChange={(e) => setF({ ...f, accent_color: e.target.value })} /></Field>
            </div>
          </div>
        </Panel>

        <Panel title="Configuration académique">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Année académique" hint="Ex. 2025-2026"><Input value={f.academic_year ?? ""} onChange={(e) => setF({ ...f, academic_year: e.target.value })} /></Field>
            <Field label="Période en cours">
              <select className={sel} value={f.current_term ?? ""} onChange={(e) => setF({ ...f, current_term: e.target.value })}>
                <option value="">—</option>
                <option value="1er trimestre">1er trimestre</option>
                <option value="2e trimestre">2e trimestre</option>
                <option value="3e trimestre">3e trimestre</option>
              </select>
            </Field>
            <Field label="Langue">
              <select className={sel} value={f.locale ?? "fr"} onChange={(e) => setF({ ...f, locale: e.target.value })}>
                <option value="fr">Français</option><option value="en">English</option>
              </select>
            </Field>
            <Field label="Devise monétaire">
              <select className={sel} value={f.currency ?? "CDF"} onChange={(e) => setF({ ...f, currency: e.target.value })}>
                <option value="CDF">CDF</option><option value="USD">USD</option>
              </select>
            </Field>
            <Field label="Fuseau horaire"><Input value={f.timezone ?? "Africa/Kinshasa"} onChange={(e) => setF({ ...f, timezone: e.target.value })} /></Field>
          </div>
        </Panel>
      </div>

      <div className="mt-6">
        <Button className="gap-2" onClick={() => save.mutate()} disabled={save.isPending}><Save className="h-4 w-4" /> Enregistrer</Button>
      </div>
    </DashboardShell>
  );
}
