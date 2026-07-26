import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, NotebookPen } from "lucide-react";
import { toast } from "sonner";
import { TeacherShell } from "@/components/dashboard/TeacherShell";
import { Button } from "@/components/ui/button";
import { listLessonPlans, saveLessonPlan, listMyClasses } from "@/lib/teacher.functions";

export const Route = createFileRoute("/dashboard/teacher/lesson-plans")({
  head: () => ({ meta: [{ title: "Plans de leçon — Enseignant" }, { name: "robots", content: "noindex" }] }),
  component: LessonPlansPage,
});

function LessonPlansPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listLessonPlans);
  const classesFn = useServerFn(listMyClasses);
  const saveFn = useServerFn(saveLessonPlan);

  const { data: rows } = useQuery({ queryKey: ["teacher", "lessons"], queryFn: () => listFn() });
  const { data: classes } = useQuery({ queryKey: ["teacher", "classes"], queryFn: () => classesFn() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ class_id: "", subject_id: "", title: "", week: "", objectives: "", content: "" });

  const distinctClasses = useMemo(() => {
    const seen = new Set<string>();
    return ((classes ?? []) as any[]).filter((r) => (seen.has(r.class_id) ? false : (seen.add(r.class_id), true)));
  }, [classes]);
  const subjectsForClass = ((classes ?? []) as any[]).filter((r) => r.class_id === form.class_id);

  const save = useMutation({
    mutationFn: () => saveFn({ data: {
      class_id: form.class_id || null,
      subject_id: form.subject_id || null,
      title: form.title,
      week: form.week || null,
      objectives: form.objectives || null,
      content: form.content || null,
    } }),
    onSuccess: () => { toast.success("Plan enregistré"); qc.invalidateQueries({ queryKey: ["teacher", "lessons"] }); setOpen(false); setForm({ class_id: "", subject_id: "", title: "", week: "", objectives: "", content: "" }); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  return (
    <TeacherShell
      title="Plans de leçon"
      subtitle="Organisez vos leçons hebdomadaires"
      actions={<Button size="sm" className="gap-2" onClick={() => setOpen((v) => !v)}><Plus className="h-4 w-4" /> Nouveau plan</Button>}
    >
      {open && (
        <div className="rounded-2xl border border-border bg-background p-6 mb-6">
          <div className="grid sm:grid-cols-2 gap-3">
            <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.class_id} onChange={(e) => setForm((f) => ({ ...f, class_id: e.target.value, subject_id: "" }))}>
              <option value="">Classe (opt.)</option>
              {distinctClasses.map((r) => <option key={r.class_id} value={r.class_id}>{r.classes.name}</option>)}
            </select>
            <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.subject_id} onChange={(e) => setForm((f) => ({ ...f, subject_id: e.target.value }))}>
              <option value="">Matière (opt.)</option>
              {subjectsForClass.map((r) => <option key={r.subject_id} value={r.subject_id}>{r.subjects?.name}</option>)}
            </select>
            <input className="sm:col-span-2 rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Titre" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <input className="rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Semaine (ex. S12)" value={form.week} onChange={(e) => setForm((f) => ({ ...f, week: e.target.value }))} />
            <textarea className="sm:col-span-2 rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]" placeholder="Objectifs" value={form.objectives} onChange={(e) => setForm((f) => ({ ...f, objectives: e.target.value }))} />
            <textarea className="sm:col-span-2 rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]" placeholder="Contenu / activités" value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
            <Button disabled={!form.title || save.isPending} onClick={() => save.mutate()}>Enregistrer</Button>
          </div>
        </div>
      )}

      {((rows ?? []) as any[]).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-background p-10 text-center">
          <NotebookPen className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Aucun plan de leçon.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {((rows ?? []) as any[]).map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-background p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{r.title}</h3>
                {r.week && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{r.week}</span>}
              </div>
              <p className="text-xs text-muted-foreground">{r.classes?.name ?? "—"} · {r.subjects?.name ?? "—"}</p>
              {r.objectives && <p className="mt-3 text-sm"><span className="font-medium">Objectifs :</span> {r.objectives}</p>}
              {r.content && <p className="mt-2 text-sm text-muted-foreground line-clamp-4">{r.content}</p>}
            </div>
          ))}
        </div>
      )}
    </TeacherShell>
  );
}