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
import { Textarea } from "@/components/ui/textarea";
import {
  listStudents, saveStudent, deleteStudent, setStudentStatus, resetStudentPassword,
  listReferenceData, uploadSchoolFile,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/dashboard/students")({
  head: () => ({
    meta: [
      { title: "Gestion des élèves — SmartSchool RDC" },
      { name: "description", content: "Ajoutez, modifiez et gérez les élèves de votre école : inscriptions, classes, comptes de connexion." },
      { property: "og:title", content: "Gestion des élèves — SmartSchool RDC" },
      { property: "og:description", content: "Gérez les inscriptions, les classes et les comptes élèves de votre établissement." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentsPage,
});

const sel = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
const empty = {
  id: undefined as string | undefined,
  first_name: "", last_name: "", gender: "", date_of_birth: "", guardian_name: "", guardian_phone: "",
  phone: "", address: "", email: "", class_id: "", matricule: "", photo_url: "",
  createAccount: false, tempPassword: randomPassword(),
};

function StudentsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listStudents);
  const refFn = useServerFn(listReferenceData);
  const saveFn = useServerFn(saveStudent);
  const delFn = useServerFn(deleteStudent);
  const statusFn = useServerFn(setStudentStatus);
  const resetFn = useServerFn(resetStudentPassword);
  const uploadFn = useServerFn(uploadSchoolFile);

  const { data: students, isLoading } = useQuery({ queryKey: ["admin", "students"], queryFn: () => listFn() });
  const { data: refs } = useQuery({ queryKey: ["admin", "refs"], queryFn: () => refFn() });

  const [q, setQ] = useState("");
  const [fClass, setFClass] = useState("");
  const [fGender, setFGender] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return ((students ?? []) as any[]).filter((s) => {
      if (fClass && s.class_id !== fClass) return false;
      if (fGender && (s.gender ?? "") !== fGender) return false;
      if (fStatus && (s.status ?? "active") !== fStatus) return false;
      if (!term) return true;
      return [s.first_name, s.last_name, s.matricule, s.phone, s.email].some((v: string) => (v ?? "").toLowerCase().includes(term));
    });
  }, [students, q, fClass, fGender, fStatus]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "students"] });
    qc.invalidateQueries({ queryKey: ["admin", "overview"] });
  };

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          id: form.id,
          first_name: form.first_name,
          last_name: form.last_name,
          gender: form.gender || null,
          date_of_birth: form.date_of_birth || null,
          guardian_name: form.guardian_name || null,
          guardian_phone: form.guardian_phone || null,
          phone: form.phone || null,
          address: form.address || null,
          email: form.email || null,
          class_id: form.class_id || null,
          matricule: form.matricule || null,
          photo_url: form.photo_url || null,
          createAccount: form.createAccount && !form.id,
          tempPassword: form.tempPassword,
        },
      }),
    onSuccess: () => { toast.success("Élève enregistré"); setOpen(false); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Élève supprimé"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const toggle = useMutation({
    mutationFn: (v: { id: string; status: "active" | "suspended" }) => statusFn({ data: v }),
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
      const res = await uploadFn({ data: { folder: "students", fileName: file.name, contentType: file.type, base64 } });
      setForm((f) => ({ ...f, photo_url: res.url }));
      toast.success("Photo téléversée");
    } catch (e: any) { toast.error(e?.message ?? "Échec du téléversement"); }
    finally { setUploading(false); }
  }

  return (
    <DashboardShell title="Élèves" subtitle="Gestion complète des inscriptions">
      <Panel
        actions={
          <Button onClick={() => { setForm({ ...empty, tempPassword: randomPassword() }); setOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Ajouter un élève
          </Button>
        }
        title={`${rows.length} élève(s)`}
      >
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className={sel} value={fClass} onChange={(e) => setFClass(e.target.value)}>
            <option value="">Toutes les classes</option>
            {((refs?.classes ?? []) as any[]).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className={sel} value={fGender} onChange={(e) => setFGender(e.target.value)}>
            <option value="">Tous les genres</option>
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
          </select>
          <select className={sel} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="suspended">Suspendu</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 pr-3">Photo</th><th className="py-2 pr-3">Nom complet</th>
                <th className="py-2 pr-3">Matricule</th><th className="py-2 pr-3">Classe</th>
                <th className="py-2 pr-3">Genre</th><th className="py-2 pr-3">Téléphone</th>
                <th className="py-2 pr-3">Statut</th><th className="py-2 pr-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">Chargement…</td></tr>}
              {!isLoading && rows.length === 0 && <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">Aucun élève.</td></tr>}
              {rows.map((s) => (
                <tr key={s.id} className="border-b border-border/60 hover:bg-secondary/40">
                  <td className="py-2 pr-3">
                    {s.photo_url ? (
                      <img src={s.photo_url} alt={`${s.first_name} ${s.last_name}`} className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {s.first_name?.[0]}{s.last_name?.[0]}
                      </div>
                    )}
                  </td>
                  <td className="py-2 pr-3 font-medium">{s.last_name} {s.first_name}</td>
                  <td className="py-2 pr-3">{s.matricule ?? "—"}</td>
                  <td className="py-2 pr-3">{s.classes?.name ?? "—"}</td>
                  <td className="py-2 pr-3">{s.gender ?? "—"}</td>
                  <td className="py-2 pr-3">{s.phone ?? s.guardian_phone ?? "—"}</td>
                  <td className="py-2 pr-3"><StatusBadge value={s.status ?? "active"} /></td>
                  <td className="py-2 pr-3">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" title="Voir" onClick={() => setView(s)}><Eye className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Modifier" onClick={() => { setForm({ ...empty, ...s, class_id: s.class_id ?? "", createAccount: false, tempPassword: randomPassword() }); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Réinitialiser le mot de passe" onClick={() => { const p = randomPassword(12); resetPwd.mutate({ id: s.id, password: p }); }}><KeyRound className="h-4 w-4" /></Button>
                      {(s.status ?? "active") === "active" ? (
                        <Button size="icon" variant="ghost" title="Suspendre" onClick={() => toggle.mutate({ id: s.id, status: "suspended" })}><Ban className="h-4 w-4" /></Button>
                      ) : (
                        <Button size="icon" variant="ghost" title="Activer" onClick={() => toggle.mutate({ id: s.id, status: "active" })}><CheckCircle2 className="h-4 w-4" /></Button>
                      )}
                      <Button size="icon" variant="ghost" title="Supprimer" onClick={() => { if (confirm("Supprimer cet élève ?")) remove.mutate(s.id); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
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
        title={form.id ? "Modifier l'élève" : "Ajouter un élève"}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.first_name || !form.last_name}>Enregistrer</Button>
          </>
        }
      >
        <div className="flex items-center gap-4">
          {form.photo_url ? <img src={form.photo_url} alt="Photo de l'élève" className="h-16 w-16 rounded-full object-cover" /> : <div className="h-16 w-16 rounded-full bg-secondary" />}
          <input type="file" accept="image/*" disabled={uploading} onChange={(e) => e.target.files?.[0] && pickPhoto(e.target.files[0])} className="text-sm" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom"><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></Field>
          <Field label="Nom"><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></Field>
          <Field label="Genre">
            <select className={sel} value={form.gender ?? ""} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="">—</option><option value="M">Masculin</option><option value="F">Féminin</option>
            </select>
          </Field>
          <Field label="Date de naissance"><Input type="date" value={form.date_of_birth ?? ""} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /></Field>
          <Field label="Parent / Tuteur"><Input value={form.guardian_name ?? ""} onChange={(e) => setForm({ ...form, guardian_name: e.target.value })} /></Field>
          <Field label="Téléphone du tuteur"><Input value={form.guardian_phone ?? ""} onChange={(e) => setForm({ ...form, guardian_phone: e.target.value })} /></Field>
          <Field label="Téléphone"><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Email (optionnel)"><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Classe">
            <select className={sel} value={form.class_id ?? ""} onChange={(e) => setForm({ ...form, class_id: e.target.value })}>
              <option value="">—</option>
              {((refs?.classes ?? []) as any[]).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Numéro d'élève"><Input value={form.matricule ?? ""} onChange={(e) => setForm({ ...form, matricule: e.target.value })} /></Field>
        </div>
        <Field label="Adresse"><Textarea rows={2} value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
        {!form.id && (
          <div className="rounded-xl border border-border p-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={form.createAccount} onChange={(e) => setForm({ ...form, createAccount: e.target.checked })} />
              Générer un compte de connexion
            </label>
            {form.createAccount && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Mot de passe temporaire" hint="Un email est requis pour créer le compte.">
                  <Input value={form.tempPassword} onChange={(e) => setForm({ ...form, tempPassword: e.target.value })} />
                </Field>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={Boolean(view)} onOpenChange={() => setView(null)} title="Fiche élève">
        {view && (
          <div className="space-y-2 text-sm">
            {view.photo_url && <img src={view.photo_url} alt="Photo" className="h-24 w-24 rounded-xl object-cover" />}
            <p><strong>{view.last_name} {view.first_name}</strong></p>
            <p className="text-muted-foreground">Matricule : {view.matricule ?? "—"}</p>
            <p className="text-muted-foreground">Classe : {view.classes?.name ?? "—"}</p>
            <p className="text-muted-foreground">Genre : {view.gender ?? "—"} · Naissance : {view.date_of_birth ?? "—"}</p>
            <p className="text-muted-foreground">Tuteur : {view.guardian_name ?? "—"} ({view.guardian_phone ?? "—"})</p>
            <p className="text-muted-foreground">Téléphone : {view.phone ?? "—"} · Email : {view.email ?? "—"}</p>
            <p className="text-muted-foreground">Adresse : {view.address ?? "—"}</p>
          </div>
        )}
      </Modal>
    </DashboardShell>
  );
}
