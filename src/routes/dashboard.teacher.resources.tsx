import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { Plus, Trash2, Pencil, FolderOpen, Upload, Eye, History, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { TeacherShell } from "@/components/dashboard/TeacherShell";
import { Button } from "@/components/ui/button";
import { listResources, saveResource, deleteResource, listResourceHistory, listMyClasses, getTeacherContext } from "@/lib/teacher.functions";
import { uploadWithProgress, signedUrl } from "@/lib/storage-upload";
import {
  ALLOWED_EXTENSIONS, RESOURCE_TYPES, MAX_FILE_SIZE_MB, formatBytes, validateFile, youtubeEmbed,
} from "@/lib/lms";

export const Route = createFileRoute("/dashboard/teacher/resources")({
  head: () => ({
    meta: [
      { title: "Ressources pédagogiques — Enseignant" },
      { name: "description", content: "Publiez et organisez vos notes de cours, présentations, vidéos et documents de référence." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResourcesPage,
});

const empty = {
  id: "" as string,
  class_id: "",
  subject_id: "",
  academic_year: "",
  term: "",
  topic: "",
  title: "",
  description: "",
  resource_type: "note" as string,
  external_url: "",
  publish_at: "",
  due_date: "",
  status: "published" as "draft" | "scheduled" | "published",
};

function ResourcesPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listResources);
  const saveFn = useServerFn(saveResource);
  const delFn = useServerFn(deleteResource);
  const histFn = useServerFn(listResourceHistory);
  const classesFn = useServerFn(listMyClasses);
  const ctxFn = useServerFn(getTeacherContext);

  const { data: rows } = useQuery({ queryKey: ["teacher", "resources"], queryFn: () => listFn() });
  const { data: classes } = useQuery({ queryKey: ["teacher", "classes"], queryFn: () => classesFn() });
  const { data: history } = useQuery({ queryKey: ["teacher", "resource-history"], queryFn: () => histFn() });
  const { data: schoolCtx } = useQuery({ queryKey: ["teacher", "context"], queryFn: () => ctxFn() });

  const distinctClasses = useMemo(() => {
    const seen = new Set<string>();
    return ((classes ?? []) as any[]).filter((r) => (seen.has(r.class_id) ? false : (seen.add(r.class_id), true)));
  }, [classes]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...empty });
  const subjectsForClass = ((classes ?? []) as any[]).filter((r) => r.class_id === form.class_id);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [existing, setExisting] = useState<{ path: string | null; name: string | null; size: number | null; mime: string | null }>({ path: null, name: null, size: null, mime: null });
  const inputRef = useRef<HTMLInputElement>(null);
  const [showHistory, setShowHistory] = useState(false);

  const allowed = ALLOWED_EXTENSIONS[form.resource_type] ?? [];

  const reset = () => {
    setForm({ ...empty });
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setProgress(null);
    setExisting({ path: null, name: null, size: null, mime: null });
  };

  const pickFile = (f: File) => {
    const err = validateFile(f, allowed);
    if (err) { toast.error(err); return; }
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const save = useMutation({
    mutationFn: async () => {
      if (form.resource_type === "video_link") {
        if (!form.external_url.trim()) throw new Error("Ajoutez un lien vidéo");
      } else if (!file && !existing.path) {
        throw new Error("Sélectionnez un fichier");
      }
      let storage_path = existing.path;
      let file_name = existing.name;
      let mime_type = existing.mime;
      let size_bytes = existing.size;
      if (file) {
        setProgress(0);
        const path = `resources/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
        await uploadWithProgress("teacher-materials", path, file, setProgress);
        storage_path = path;
        file_name = file.name;
        mime_type = file.type || null;
        size_bytes = file.size;
      }
      return saveFn({ data: {
        id: form.id || undefined,
        class_id: form.class_id || null,
        subject_id: form.subject_id || null,
        academic_year: form.academic_year || schoolCtx?.academic_year || null,
        term: form.term || schoolCtx?.current_term || null,
        topic: form.topic || null,
        title: form.title,
        description: form.description || null,
        resource_type: form.resource_type as any,
        storage_path,
        external_url: form.external_url || null,
        file_name,
        mime_type,
        size_bytes,
        publish_at: form.publish_at ? new Date(form.publish_at).toISOString() : null,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        status: form.status,
      } });
    },
    onSuccess: () => {
      toast.success("Ressource enregistrée");
      qc.invalidateQueries({ queryKey: ["teacher", "resources"] });
      qc.invalidateQueries({ queryKey: ["teacher", "resource-history"] });
      setOpen(false);
      reset();
    },
    onError: (e: any) => { setProgress(null); toast.error(e?.message ?? "Erreur"); },
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Ressource supprimée");
      qc.invalidateQueries({ queryKey: ["teacher", "resources"] });
      qc.invalidateQueries({ queryKey: ["teacher", "resource-history"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const edit = (r: any) => {
    setForm({
      id: r.id,
      class_id: r.class_id ?? "",
      subject_id: r.subject_id ?? "",
      academic_year: r.academic_year ?? "",
      term: r.term ?? "",
      topic: r.topic ?? "",
      title: r.title,
      description: r.description ?? "",
      resource_type: r.resource_type,
      external_url: r.external_url ?? "",
      publish_at: r.publish_at ? new Date(r.publish_at).toISOString().slice(0, 16) : "",
      due_date: r.due_date ? new Date(r.due_date).toISOString().slice(0, 16) : "",
      status: r.status,
    });
    setExisting({ path: r.storage_path ?? null, name: r.file_name ?? null, size: r.size_bytes ?? null, mime: r.mime_type ?? null });
    setFile(null);
    setPreviewUrl(null);
    setOpen(true);
  };

  const openFile = async (path: string) => {
    try { window.open(await signedUrl("teacher-materials", path, 3600), "_blank"); }
    catch (e: any) { toast.error(e?.message ?? "Impossible d'ouvrir le fichier"); }
  };

  return (
    <TeacherShell
      title="Ressources pédagogiques"
      subtitle="Notes de cours, présentations, vidéos et documents de référence"
      actions={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowHistory((v) => !v)}>
            <History className="h-4 w-4" /> Historique
          </Button>
          <Button size="sm" className="gap-2" onClick={() => { reset(); setOpen((v) => !v); }}>
            <Plus className="h-4 w-4" /> Nouvelle ressource
          </Button>
        </div>
      }
    >
      {open && (
        <div className="rounded-2xl border border-border bg-background p-6 mb-6">
          <div className="grid sm:grid-cols-2 gap-3">
            <input className="sm:col-span-2 rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Titre de la ressource" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <textarea className="sm:col-span-2 rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[70px]" placeholder="Description (optionnel)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.resource_type} onChange={(e) => { setForm((f) => ({ ...f, resource_type: e.target.value })); setFile(null); setPreviewUrl(null); }}>
              {RESOURCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.class_id} onChange={(e) => setForm((f) => ({ ...f, class_id: e.target.value, subject_id: "" }))}>
              <option value="">Classe (toutes)</option>
              {distinctClasses.map((r) => <option key={r.class_id} value={r.class_id}>{r.classes?.name}</option>)}
            </select>
            <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.subject_id} onChange={(e) => setForm((f) => ({ ...f, subject_id: e.target.value }))}>
              <option value="">Matière (opt.)</option>
              {subjectsForClass.map((r) => <option key={r.subject_id} value={r.subject_id}>{r.subjects?.name}</option>)}
            </select>
            <input className="rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Année académique (ex. 2025-2026)" value={form.academic_year || (schoolCtx?.academic_year ?? "")} onChange={(e) => setForm((f) => ({ ...f, academic_year: e.target.value }))} />
            <input className="rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Trimestre (ex. T1)" value={form.term || (schoolCtx?.current_term ?? "")} onChange={(e) => setForm((f) => ({ ...f, term: e.target.value }))} />
            <input className="rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Thème / chapitre" value={form.topic} onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))} />

            {form.resource_type === "video_link" ? (
              <input className="sm:col-span-2 rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Lien vidéo (YouTube, Vimeo…)" value={form.external_url} onChange={(e) => setForm((f) => ({ ...f, external_url: e.target.value }))} />
            ) : (
              <div className="sm:col-span-2">
                <input ref={inputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); }} />
                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => inputRef.current?.click()}>
                  <Upload className="h-4 w-4" /> Choisir un fichier
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  Autorisés : {allowed.join(", ")} · max {MAX_FILE_SIZE_MB} Mo
                </p>
                {(file || existing.name) && (
                  <p className="mt-1 text-xs">
                    {file?.name ?? existing.name} · {formatBytes(file?.size ?? existing.size)} · {file?.type || existing.mime || "type inconnu"}
                  </p>
                )}
                {progress !== null && (
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                  </div>
                )}
              </div>
            )}

            <label className="text-xs text-muted-foreground">Date de publication
              <input type="datetime-local" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.publish_at} onChange={(e) => setForm((f) => ({ ...f, publish_at: e.target.value }))} />
            </label>
            <label className="text-xs text-muted-foreground">Date limite (optionnel)
              <input type="datetime-local" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
            </label>
            <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}>
              <option value="published">Visible immédiatement</option>
              <option value="scheduled">Programmée</option>
              <option value="draft">Brouillon</option>
            </select>
          </div>

          {(previewUrl || form.external_url) && (
            <div className="mt-4 rounded-xl border border-border p-3">
              <p className="text-xs font-medium mb-2 flex items-center gap-1"><Eye className="h-3 w-3" /> Aperçu avant publication</p>
              {form.resource_type === "image" && previewUrl ? (
                <img src={previewUrl} alt={form.title || "Aperçu de la ressource"} className="max-h-64 rounded-lg" />
              ) : form.resource_type === "video" && previewUrl ? (
                <video src={previewUrl} controls className="max-h-64 w-full rounded-lg" />
              ) : form.resource_type === "video_link" && youtubeEmbed(form.external_url) ? (
                <iframe src={youtubeEmbed(form.external_url)!} title="Aperçu vidéo" className="aspect-video w-full rounded-lg" allowFullScreen />
              ) : previewUrl ? (
                <iframe src={previewUrl} title="Aperçu du document" className="h-64 w-full rounded-lg" />
              ) : (
                <p className="text-xs text-muted-foreground">Aperçu indisponible pour ce format.</p>
              )}
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setOpen(false); reset(); }}>Annuler</Button>
            <Button disabled={!form.title || save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? "Enregistrement…" : form.id ? "Mettre à jour" : "Publier"}
            </Button>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="rounded-2xl border border-border bg-background p-5 mb-6">
          <h2 className="text-sm font-semibold mb-3">Historique des envois</h2>
          {((history ?? []) as any[]).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun historique.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {((history ?? []) as any[]).map((h) => (
                <li key={h.id} className="flex flex-wrap justify-between gap-2 border-b border-border pb-2 last:border-0">
                  <span>
                    <span className="font-medium">{h.actor_name ?? "—"}</span> · {h.action} · {h.details?.title ?? "—"}
                  </span>
                  <span className="text-muted-foreground text-xs">{new Date(h.created_at).toLocaleString("fr-FR")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {((rows ?? []) as any[]).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-background p-10 text-center">
          <FolderOpen className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Aucune ressource. Créez votre première ressource pédagogique.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-background">
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
            <thead className="bg-secondary/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Titre</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Classe / Matière</th>
                <th className="px-4 py-3 font-medium">Année · Trim. · Thème</th>
                <th className="px-4 py-3 font-medium">Fichier</th>
                <th className="px-4 py-3 font-medium">Publication</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {((rows ?? []) as any[]).map((r) => (
                <tr key={r.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3 font-medium">{r.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{RESOURCE_TYPES.find((t) => t.value === r.resource_type)?.label ?? r.resource_type}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.classes?.name ?? "Toutes"} · {r.subjects?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{[r.academic_year, r.term, r.topic].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.storage_path ? (
                      <button onClick={() => openFile(r.storage_path)} className="text-primary hover:underline inline-flex items-center gap-1 text-xs">
                        <ExternalLink className="h-3 w-3" /> {r.file_name ?? "Ouvrir"} ({formatBytes(r.size_bytes)})
                      </button>
                    ) : r.external_url ? (
                      <a href={r.external_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs">Lien externe</a>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(r.publish_at).toLocaleString("fr-FR")}{r.due_date ? ` · limite ${new Date(r.due_date).toLocaleDateString("fr-FR")}` : ""}</td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{r.status}</span></td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button aria-label="Modifier" className="text-muted-foreground hover:text-foreground" onClick={() => edit(r)}><Pencil className="h-4 w-4 inline" /></button>
                    <button aria-label="Supprimer" className="text-red-500 hover:text-red-600" onClick={() => del.mutate(r.id)}><Trash2 className="h-4 w-4 inline" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}
    </TeacherShell>
  );
}