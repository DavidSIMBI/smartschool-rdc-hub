import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Megaphone, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Panel, Field, Modal, StatusBadge, fileToBase64 } from "@/components/dashboard/admin-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { listAdminAnnouncements, saveAnnouncement, deleteAnnouncement, uploadSchoolFile } from "@/lib/admin.functions";

export const Route = createFileRoute("/dashboard/announcements")({
  head: () => ({
    meta: [
      { title: "Annonces — SmartSchool RDC" },
      { name: "description", content: "Publiez des annonces avec image et pièce jointe PDF, programmez leur diffusion et gérez les brouillons." },
      { property: "og:title", content: "Annonces — SmartSchool RDC" },
      { property: "og:description", content: "Communiquez avec parents, élèves et enseignants depuis un seul espace." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AnnouncementsPage,
});

const sel = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
const empty = {
  id: undefined as string | undefined,
  title: "", body: "", audience: "all", image_url: "", attachment_url: "", publish_at: "",
  status: "published" as "draft" | "published" | "scheduled",
};

function AnnouncementsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAdminAnnouncements);
  const saveFn = useServerFn(saveAnnouncement);
  const delFn = useServerFn(deleteAnnouncement);
  const uploadFn = useServerFn(uploadSchoolFile);

  const { data: items, isLoading } = useQuery({ queryKey: ["admin", "announcements"], queryFn: () => listFn() });
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "announcements"] });
    qc.invalidateQueries({ queryKey: ["admin", "overview"] });
  };

  const save = useMutation({
    mutationFn: () => saveFn({
      data: {
        id: form.id,
        title: form.title,
        body: form.body || null,
        audience: form.audience || null,
        image_url: form.image_url || null,
        attachment_url: form.attachment_url || null,
        publish_at: form.publish_at ? new Date(form.publish_at).toISOString() : null,
        status: form.status,
      },
    }),
    onSuccess: () => { toast.success("Annonce enregistrée"); setOpen(false); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Annonce supprimée"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  async function upload(file: File, key: "image_url" | "attachment_url") {
    setBusy(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await uploadFn({ data: { folder: "announcements", fileName: file.name, contentType: file.type, base64 } });
      setForm((f) => ({ ...f, [key]: res.url }));
      toast.success("Fichier téléversé");
    } catch (e: any) { toast.error(e?.message ?? "Échec du téléversement"); }
    finally { setBusy(false); }
  }

  return (
    <DashboardShell title="Annonces" subtitle="Communication de l'établissement">
      <Panel
        title={`${(items ?? []).length} annonce(s)`}
        actions={<Button onClick={() => { setForm(empty); setOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Créer une annonce</Button>}
      >
        {isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Chargement…</p>}
        {!isLoading && (items ?? []).length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Aucune annonce.</p>}
        <ul className="space-y-3">
          {((items ?? []) as any[]).map((a) => (
            <li key={a.id} className="rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  {a.image_url ? (
                    <img src={a.image_url} alt={a.title} className="h-16 w-16 rounded-lg object-cover" />
                  ) : (
                    <div className="grid h-16 w-16 place-items-center rounded-lg bg-primary/10 text-primary"><Megaphone className="h-5 w-5" /></div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{a.title}</h3>
                      <StatusBadge value={a.status} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.body ?? ""}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Audience : {a.audience ?? "tous"} ·{" "}
                      {a.publish_at ? `Diffusion : ${new Date(a.publish_at).toLocaleString("fr-FR")}` : new Date(a.created_at).toLocaleDateString("fr-FR")}
                      {a.attachment_url && (
                        <>
                          {" · "}
                          <a href={a.attachment_url} target="_blank" rel="noreferrer" className="text-primary underline">Pièce jointe</a>
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" title="Modifier" onClick={() => {
                    setForm({
                      id: a.id, title: a.title, body: a.body ?? "", audience: a.audience ?? "all",
                      image_url: a.image_url ?? "", attachment_url: a.attachment_url ?? "",
                      publish_at: a.publish_at ? String(a.publish_at).slice(0, 16) : "",
                      status: a.status ?? "published",
                    });
                    setOpen(true);
                  }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" title="Supprimer" onClick={() => { if (confirm("Supprimer cette annonce ?")) remove.mutate(a.id); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Modal
        open={open}
        onOpenChange={setOpen}
        wide
        title={form.id ? "Modifier l'annonce" : "Créer une annonce"}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.title}>Enregistrer</Button>
          </>
        }
      >
        <Field label="Titre"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Contenu"><Textarea rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Audience">
            <select className={sel} value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
              <option value="all">Tous</option>
              <option value="students">Élèves</option>
              <option value="teachers">Enseignants</option>
              <option value="parents">Parents</option>
            </select>
          </Field>
          <Field label="Statut">
            <select className={sel} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
              <option value="published">Publiée</option>
              <option value="draft">Brouillon</option>
              <option value="scheduled">Programmée</option>
            </select>
          </Field>
          <Field label="Date de diffusion">
            <Input type="datetime-local" value={form.publish_at} onChange={(e) => setForm({ ...form, publish_at: e.target.value })} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Image">
            <div className="flex items-center gap-3">
              {form.image_url && <img src={form.image_url} alt="Aperçu" className="h-12 w-12 rounded object-cover" />}
              <input type="file" accept="image/*" disabled={busy} className="text-sm" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "image_url")} />
            </div>
          </Field>
          <Field label="Pièce jointe (PDF)">
            <div className="flex items-center gap-3">
              {form.attachment_url && <Paperclip className="h-4 w-4 text-primary" />}
              <input type="file" accept="application/pdf" disabled={busy} className="text-sm" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "attachment_url")} />
            </div>
          </Field>
        </div>
      </Modal>
    </DashboardShell>
  );
}
