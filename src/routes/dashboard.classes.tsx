import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Users, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Panel, Field, Modal } from "@/components/dashboard/admin-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listClasses, saveClass, deleteClass, assignStudentsToClass, saveSubject,
  listReferenceData, listStudents,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/dashboard/classes")({
  head: () => ({
    meta: [
      { title: "Gestion des classes — SmartSchool RDC" },
      { name: "description", content: "Créez les classes, assignez le titulaire et inscrivez les élèves de votre établissement." },
      { property: "og:title", content: "Gestion des classes — SmartSchool RDC" },
      { property: "og:description", content: "Classes, sections, titulaires et effectifs de votre école." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClassesPage,
});

const sel = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
const empty = { id: undefined as string | undefined, name: "", level: "", section: "", academic_year: "", class_teacher_id: "" };

function ClassesPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listClasses);
  const refFn = useServerFn(listReferenceData);
  const studentsFn = useServerFn(listStudents);
  const saveFn = useServerFn(saveClass);
  const delFn = useServerFn(deleteClass);
  const assignFn = useServerFn(assignStudentsToClass);
  const subjectFn = useServerFn(saveSubject);

  const { data: classes, isLoading } = useQuery({ queryKey: ["admin", "classes"], queryFn: () => listFn() });
  const { data: refs } = useQuery({ queryKey: ["admin", "refs"], queryFn: () => refFn() });
  const { data: students } = useQuery({ queryKey: ["admin", "students"], queryFn: () => studentsFn() });

  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [assign, setAssign] = useState<any>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [subject, setSubject] = useState({ name: "", code: "" });
  const [subjOpen, setSubjOpen] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "classes"] });
    qc.invalidateQueries({ queryKey: ["admin", "refs"] });
    qc.invalidateQueries({ queryKey: ["admin", "students"] });
    qc.invalidateQueries({ queryKey: ["admin", "overview"] });
  };

  const save = useMutation({
    mutationFn: () => saveFn({
      data: {
        id: form.id,
        name: form.name,
        level: form.level || null,
        section: form.section || null,
        academic_year: form.academic_year || null,
        class_teacher_id: form.class_teacher_id || null,
      },
    }),
    onSuccess: () => { toast.success("Classe enregistrée"); setOpen(false); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Classe supprimée"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const doAssign = useMutation({
    mutationFn: () => assignFn({ data: { classId: assign.id, studentIds: picked } }),
    onSuccess: () => { toast.success("Élèves assignés"); setAssign(null); setPicked([]); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const addSubject = useMutation({
    mutationFn: () => subjectFn({ data: { name: subject.name, code: subject.code || null } }),
    onSuccess: () => { toast.success("Matière créée"); setSubject({ name: "", code: "" }); setSubjOpen(false); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  return (
    <DashboardShell title="Classes" subtitle="Organisation académique de votre école">
      <Panel
        title={`${(classes ?? []).length} classe(s)`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setSubjOpen(true)}><BookOpen className="mr-2 h-4 w-4" /> Nouvelle matière</Button>
            <Button onClick={() => { setForm(empty); setOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Créer une classe</Button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 pr-3">Classe</th><th className="py-2 pr-3">Section</th>
                <th className="py-2 pr-3">Niveau</th><th className="py-2 pr-3">Élèves</th>
                <th className="py-2 pr-3">Titulaire</th><th className="py-2 pr-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Chargement…</td></tr>}
              {!isLoading && (classes ?? []).length === 0 && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Aucune classe.</td></tr>}
              {((classes ?? []) as any[]).map((c) => (
                <tr key={c.id} className="border-b border-border/60 hover:bg-secondary/40">
                  <td className="py-2 pr-3 font-medium">{c.name}</td>
                  <td className="py-2 pr-3">{c.section ?? "—"}</td>
                  <td className="py-2 pr-3">{c.level ?? "—"}</td>
                  <td className="py-2 pr-3">{c.student_count}</td>
                  <td className="py-2 pr-3">{c.teacher ? `${c.teacher.last_name} ${c.teacher.first_name}` : "—"}</td>
                  <td className="py-2 pr-3">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" title="Assigner des élèves" onClick={() => {
                        setAssign(c);
                        setPicked(((students ?? []) as any[]).filter((s) => s.class_id === c.id).map((s) => s.id));
                      }}><Users className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Modifier" onClick={() => {
                        setForm({
                          id: c.id, name: c.name, level: c.level ?? "", section: c.section ?? "",
                          academic_year: c.academic_year ?? "", class_teacher_id: c.class_teacher_id ?? "",
                        });
                        setOpen(true);
                      }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Supprimer" onClick={() => { if (confirm("Supprimer cette classe ?")) remove.mutate(c.id); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
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
        title={form.id ? "Modifier la classe" : "Créer une classe"}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name}>Enregistrer</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom de la classe"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Section"><Input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} /></Field>
          <Field label="Niveau"><Input value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} /></Field>
          <Field label="Année académique"><Input placeholder="2025-2026" value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} /></Field>
        </div>
        <Field label="Titulaire de classe">
          <select className={sel} value={form.class_teacher_id} onChange={(e) => setForm({ ...form, class_teacher_id: e.target.value })}>
            <option value="">—</option>
            {((refs?.teachers ?? []) as any[]).map((t) => <option key={t.id} value={t.id}>{t.last_name} {t.first_name}</option>)}
          </select>
        </Field>
      </Modal>

      <Modal
        open={Boolean(assign)}
        onOpenChange={() => setAssign(null)}
        wide
        title={assign ? `Assigner des élèves — ${assign.name}` : ""}
        footer={
          <>
            <Button variant="outline" onClick={() => setAssign(null)}>Annuler</Button>
            <Button onClick={() => doAssign.mutate()} disabled={doAssign.isPending}>Enregistrer</Button>
          </>
        }
      >
        <div className="max-h-[50vh] space-y-1 overflow-y-auto">
          {((students ?? []) as any[]).map((s) => (
            <label key={s.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-secondary/50">
              <input
                type="checkbox"
                checked={picked.includes(s.id)}
                onChange={() => setPicked((p) => (p.includes(s.id) ? p.filter((x) => x !== s.id) : [...p, s.id]))}
              />
              <span className="font-medium">{s.last_name} {s.first_name}</span>
              <span className="text-xs text-muted-foreground">{s.matricule ?? ""} · {s.classes?.name ?? "sans classe"}</span>
            </label>
          ))}
          {(students ?? []).length === 0 && <p className="text-sm text-muted-foreground">Aucun élève enregistré.</p>}
        </div>
      </Modal>

      <Modal
        open={subjOpen}
        onOpenChange={setSubjOpen}
        title="Nouvelle matière"
        footer={
          <>
            <Button variant="outline" onClick={() => setSubjOpen(false)}>Annuler</Button>
            <Button onClick={() => addSubject.mutate()} disabled={addSubject.isPending || !subject.name}>Enregistrer</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom"><Input value={subject.name} onChange={(e) => setSubject({ ...subject, name: e.target.value })} /></Field>
          <Field label="Code"><Input value={subject.code} onChange={(e) => setSubject({ ...subject, code: e.target.value })} /></Field>
        </div>
        <div className="flex flex-wrap gap-2">
          {((refs?.subjects ?? []) as any[]).map((s) => (
            <span key={s.id} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">{s.name}</span>
          ))}
        </div>
      </Modal>
    </DashboardShell>
  );
}
