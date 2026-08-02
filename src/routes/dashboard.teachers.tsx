import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Search, Eye, Pencil, Trash2, KeyRound, Ban, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Panel, Field, Modal, StatusBadge, fileToBase64, randomPassword } from "@/components/dashboard/admin-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listTeachers, saveTeacher, deleteTeacher, setTeacherStatus, resetTeacherPassword,
  listReferenceData, uploadSchoolFile,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/dashboard/teachers")({
  head: () => ({
    meta: [
      { title: "Gestion des enseignants — SmartSchool RDC" },
      { name: "description", content: "Créez et gérez les enseignants de votre école : matières, classes assignées, comptes de connexion." },
      { property: "og:title", content: "Gestion des enseignants — SmartSchool RDC" },
      { property: "og:description", content: "Enseignants, matières et classes assignées de votre établissement." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TeachersPage,
});

const empty = {
  id: undefined as string | undefined,
  first_name: "", last_name: "", email: "", phone: "", specialty: "", qualification: "", photo_url: "",
  subjectIds: [] as string[], classIds: [] as string[],
  createAccount: false, tempPassword: randomPassword(),
};

function TeachersPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listTeachers);
  const refFn = useServerFn(listReferenceData);
  const saveFn = useServerFn(saveTeacher);
  const delFn = useServerFn(deleteTeacher);
  const statusFn = useServerFn(setTeacherStatus);
  const resetFn = useServerFn(resetTeacherPassword);
  const uploadFn = useServerFn(uploadSchoolFile);

  const { data: teachers, isLoading } = useQuery({ queryKey: ["admin", "teachers"], queryFn: () => listFn() });
  const { data: refs } = useQuery({ queryKey: ["admin", "refs"], queryFn: () => refFn() });

  const [q, setQ] = useState("");
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return ((teachers ?? []) as any[]).filter((t) =>
      !term || [t.first_name, t.last_name, t.email, t.phone, t.specialty].some((v: string) => (v ?? "").toLowerCase().includes(term)),
    );
  }, [teachers, q]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "teachers"] });
    qc.invalidateQueries({ queryKey: ["admin", "refs"] });
    qc.invalidateQueries({ queryKey: ["admin", "overview"] });
  };

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          id: form.id,
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email || null,
          phone: form.phone || null,
          specialty: form.specialty || null,
          qualification: form.qualification || null,
          photo_url: form.photo_url || null,
          subjectIds: form.subjectIds,
          classIds: form.classIds,
          createAccount: form.createAccount && !form.id,
          tempPassword: form.tempPassword,
        },
      }),
    onSuccess: () => { toast.success("Enseignant enregistré"); setOpen(false); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Enseignant supprimé"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const toggle = useMutation({
    mutationFn: (v: { id: string; status: "active" | "inactive" }) => statusFn({ data: v }),
    onSuccess: () => { toast.success("Statut mis à jour"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const resetPwd = useMutation({
    mutationFn: (v: { id: string; password: string }) => resetFn({ data: v }),
    onSuccess: (_d, v) => toast.success(`Nouveau mot de passe : ${v.password}`, { duration: 12000 }),
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  async function pickPhoto(file: File) {
    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await uploadFn({ data: { folder: "teachers", fileName: file.name, contentType: file.type, base64 } });
      setForm((f) => ({ ...f, photo_url: res.url }));
      toast.success("Photo téléversée");
    } catch (e: any) { toast.error(e?.message ?? "Échec du téléversement"); }
    finally { setUploading(false); }
  }

  const toggleId = (key: "subjectIds" | "classIds", id: string) =>
    setForm((f) => ({ ...f, [key]: f[key].includes(id) ? f[key].filter((x) => x !== id) : [...f[key], id] }));

  return (
    <DashboardShell title="Enseignants" subtitle="Corps enseignant de votre école">
      <Panel
        title={`${rows.length} enseignant(s)`}
        actions={
          <Button onClick={() => { setForm({ ...empty, tempPassword: randomPassword() }); setOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Créer un enseignant
          </Button>
        }
      >
        <div className="mb-4 relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 pr-3">Photo</th><th className="py-2 pr-3">Nom</th>
                <th className="py-2 pr-3">Matière</th><th className="py-2 pr-3">Téléphone</th>
                <th className="py-2 pr-3">Email</th><th className="py-2 pr-3">Statut</th>
                <th className="py-2 pr-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">Chargement…</td></tr>}
              {!isLoading && rows.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">Aucun enseignant.</td></tr>}
              {rows.map((t) => (
                <tr key={t.id} className="border-b border-border/60 hover:bg-secondary/40">
                  <td className="py-2 pr-3">
                    {t.photo_url ? (
                      <img src={t.photo_url} alt={`${t.first_name} ${t.last_name}`} className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {t.first_name?.[0]}{t.last_name?.[0]}
                      </div>
                    )}
                  </td>
                  <td className="py-2 pr-3 font-medium">{t.last_name} {t.first_name}</td>
                  <td className="py-2 pr-3">{t.specialty ?? "—"}</td>
                  <td className="py-2 pr-3">{t.phone ?? "—"}</td>
                  <td className="py-2 pr-3">{t.email ?? "—"}</td>
                  <td className="py-2 pr-3"><StatusBadge value={t.status ?? "active"} /></td>
                  <td className="py-2 pr-3">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" title="Voir" onClick={() => setView(t)}><Eye className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Modifier" onClick={() => {
                        setForm({
                          ...empty, ...t,
                          subjectIds: Array.from(new Set((t.links ?? []).map((l: any) => l.subject_id).filter(Boolean))) as string[],
                          classIds: Array.from(new Set((t.links ?? []).map((l: any) => l.class_id).filter(Boolean))) as string[],
                          createAccount: false, tempPassword: randomPassword(),
                        });
                        setOpen(true);
                      }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Réinitialiser le mot de passe" onClick={() => { const p = randomPassword(12); resetPwd.mutate({ id: t.id, password: p }); }}><KeyRound className="h-4 w-4" /></Button>
                      {(t.status ?? "active") === "active" ? (
                        <Button size="icon" variant="ghost" title="Désactiver" onClick={() => toggle.mutate({ id: t.id, status: "inactive" })}><Ban className="h-4 w-4" /></Button>
                      ) : (
                        <Button size="icon" variant="ghost" title="Activer" onClick={() => toggle.mutate({ id: t.id, status: "active" })}><CheckCircle2 className="h-4 w-4" /></Button>
                      )}
                      <Button size="icon" variant="ghost" title="Supprimer" onClick={() => { if (confirm("Supprimer cet enseignant ?")) remove.mutate(t.id); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Modal
        open={open}
        onOpenChange={setOpen}
        wide
        title={form.id ? "Modifier l'enseignant" : "Créer un enseignant"}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.first_name || !form.last_name}>Enregistrer</Button>
          </>
        }
      >
        <div className="flex items-center gap-4">
          {form.photo_url ? <img src={form.photo_url} alt="Photo de l'enseignant" className="h-16 w-16 rounded-full object-cover" /> : <div className="h-16 w-16 rounded-full bg-secondary" />}
          <input type="file" accept="image/*" disabled={uploading} onChange={(e) => e.target.files?.[0] && pickPhoto(e.target.files[0])} className="text-sm" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom"><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></Field>
          <Field label="Nom"><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></Field>
          <Field label="Téléphone"><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Spécialité"><Input value={form.specialty ?? ""} onChange={(e) => setForm({ ...form, specialty: e.target.value })} /></Field>
          <Field label="Qualification"><Input value={form.qualification ?? ""} onChange={(e) => setForm({ ...form, qualification: e.target.value })} /></Field>
        </div>

        <Field label="Matières enseignées">
          <div className="flex flex-wrap gap-2">
            {((refs?.subjects ?? []) as any[]).map((s) => (
              <button key={s.id} type="button" onClick={() => toggleId("subjectIds", s.id)}
                className={`rounded-full border px-3 py-1 text-xs ${form.subjectIds.includes(s.id) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                {s.name}
              </button>
            ))}
            {(refs?.subjects ?? []).length === 0 && <span className="text-xs text-muted-foreground">Aucune matière. Créez-en dans Classes.</span>}
          </div>
        </Field>

        <Field label="Classes assignées">
          <div className="flex flex-wrap gap-2">
            {((refs?.classes ?? []) as any[]).map((c) => (
              <button key={c.id} type="button" onClick={() => toggleId("classIds", c.id)}
                className={`rounded-full border px-3 py-1 text-xs ${form.classIds.includes(c.id) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                {c.name}
              </button>
            ))}
            {(refs?.classes ?? []).length === 0 && <span className="text-xs text-muted-foreground">Aucune classe.</span>}
          </div>
        </Field>

        {!form.id && (
          <div className="rounded-xl border border-border p-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={form.createAccount} onChange={(e) => setForm({ ...form, createAccount: e.target.checked })} />
              Générer un compte de connexion
            </label>
            {form.createAccount && (
              <div className="mt-3">
                <Field label="Mot de passe temporaire" hint="Un email est requis pour créer le compte.">
                  <Input value={form.tempPassword} onChange={(e) => setForm({ ...form, tempPassword: e.target.value })} />
                </Field>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={Boolean(view)} onOpenChange={() => setView(null)} title="Fiche enseignant">
        {view && (
          <div className="space-y-2 text-sm">
            {view.photo_url && <img src={view.photo_url} alt="Photo" className="h-24 w-24 rounded-xl object-cover" />}
            <p><strong>{view.last_name} {view.first_name}</strong></p>
            <p className="text-muted-foreground">Spécialité : {view.specialty ?? "—"}</p>
            <p className="text-muted-foreground">Qualification : {view.qualification ?? "—"}</p>
            <p className="text-muted-foreground">Téléphone : {view.phone ?? "—"} · Email : {view.email ?? "—"}</p>
            <p className="text-muted-foreground">
              Cours : {(view.links ?? []).map((l: any) => `${l.subjects?.name ?? "?"} (${l.classes?.name ?? "?"})`).join(", ") || "—"}
            </p>
          </div>
        )}
      </Modal>
    </DashboardShell>
  );
}
