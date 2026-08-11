import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Trash2, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { TeacherShell } from "@/components/dashboard/TeacherShell";
import { Button } from "@/components/ui/button";
import { listAssignments, saveAssignment, deleteAssignment, listMyClasses } from "@/lib/teacher.functions";

export const Route = createFileRoute("/dashboard/teacher/assignments")({
  head: () => ({ meta: [{ title: "Devoirs — Enseignant" }, { name: "robots", content: "noindex" }] }),
  component: AssignmentsPage,
});

function AssignmentsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAssignments);
  const classesFn = useServerFn(listMyClasses);
  const saveFn = useServerFn(saveAssignment);
  const delFn = useServerFn(deleteAssignment);

  const { data: rows } = useQuery({ queryKey: ["teacher", "assignments"], queryFn: () => listFn() });
  const { data: classes } = useQuery({ queryKey: ["teacher", "classes"], queryFn: () => classesFn() });

  const distinctClasses = useMemo(() => {
    const seen = new Set<string>();
    return ((classes ?? []) as any[]).filter((r) => (seen.has(r.class_id) ? false : (seen.add(r.class_id), true)));
  }, [classes]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ class_id: "", subject_id: "", title: "", instructions: "", due_date: "", open_at: "", allow_late: false, max_score: 20 });

  const save = useMutation({
    mutationFn: () => saveFn({ data: {
      class_id: form.class_id,
      subject_id: form.subject_id || null,
      title: form.title,
      instructions: form.instructions,
      due_date: form.due_date || null,
      open_at: form.open_at || null,
      allow_late: form.allow_late,
      max_score: Number(form.max_score) || 20,
      publish: true,
      attachments: [],
      status: "open",
    } }),
    onSuccess: () => {
      toast.success("Devoir créé et publié");
      qc.invalidateQueries({ queryKey: ["teacher"] });
      setOpen(false);
      setForm({ class_id: "", subject_id: "", title: "", instructions: "", due_date: "", open_at: "", allow_late: false, max_score: 20 });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Supprimé"); qc.invalidateQueries({ queryKey: ["teacher", "assignments"] }); },
  });

  const subjectsForClass = ((classes ?? []) as any[]).filter((r) => r.class_id === form.class_id);

  return (
    <TeacherShell
      title="Devoirs"
      subtitle="Créez et suivez les devoirs de vos classes"
      actions={<Button size="sm" className="gap-2" onClick={() => setOpen((v) => !v)}><Plus className="h-4 w-4" /> Nouveau</Button>}
    >
      {open && (
        <div className="rounded-2xl border border-border bg-background p-6 mb-6 animate-in slide-in-from-top-2">
          <div className="grid sm:grid-cols-2 gap-3">
            <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.class_id} onChange={(e) => setForm((f) => ({ ...f, class_id: e.target.value, subject_id: "" }))}>
              <option value="">Classe…</option>
              {distinctClasses.map((r) => <option key={r.class_id} value={r.class_id}>{r.classes.name}</option>)}
            </select>
            <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.subject_id} onChange={(e) => setForm((f) => ({ ...f, subject_id: e.target.value }))}>
              <option value="">Matière (opt.)</option>
              {subjectsForClass.map((r) => <option key={r.subject_id} value={r.subject_id}>{r.subjects?.name}</option>)}
            </select>
            <input className="sm:col-span-2 rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Titre du devoir" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <textarea className="sm:col-span-2 rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]" placeholder="Consignes" value={form.instructions} onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))} />
            <label className="text-xs text-muted-foreground">Date d'ouverture
              <input type="datetime-local" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.open_at} onChange={(e) => setForm((f) => ({ ...f, open_at: e.target.value }))} />
            </label>
            <label className="text-xs text-muted-foreground">Date limite
              <input type="datetime-local" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
            </label>
            <label className="text-xs text-muted-foreground">Note maximale
              <input type="number" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.max_score} onChange={(e) => setForm((f) => ({ ...f, max_score: Number(e.target.value) }))} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.allow_late} onChange={(e) => setForm((f) => ({ ...f, allow_late: e.target.checked }))} />
              Autoriser les remises tardives
            </label>
          </div>
          <div className="mt-4 flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
            <Button disabled={!form.class_id || !form.title || save.isPending} onClick={() => save.mutate()}>Créer</Button>
          </div>
        </div>
      )}

      {(rows ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-background p-10 text-center">
          <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Aucun devoir. Cliquez sur « Nouveau » pour en créer un.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-background">
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
            <thead className="bg-secondary/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Titre</th>
                <th className="px-4 py-3 font-medium">Classe</th>
                <th className="px-4 py-3 font-medium">Matière</th>
                <th className="px-4 py-3 font-medium">Échéance</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {((rows ?? []) as any[]).map((r) => (
                <tr key={r.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3 font-medium">{r.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.classes?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.subjects?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.due_date ? new Date(r.due_date).toLocaleString("fr-FR") : "—"}</td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{r.status}</span></td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-red-500 hover:text-red-600" onClick={() => del.mutate(r.id)}><Trash2 className="h-4 w-4" /></button>
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