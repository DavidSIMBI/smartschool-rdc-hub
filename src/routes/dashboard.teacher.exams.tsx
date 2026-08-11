import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, FileText, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { TeacherShell } from "@/components/dashboard/TeacherShell";
import { Button } from "@/components/ui/button";
import { ExamQuestionEditor } from "@/components/dashboard/ExamQuestionEditor";
import {
  listExams, saveExam, listMyClasses, getExamResults, saveExamMarks, publishExam, getTeacherContext,
} from "@/lib/teacher.functions";

export const Route = createFileRoute("/dashboard/teacher/exams")({
  head: () => ({ meta: [{ title: "Examens & notes — Enseignant" }, { name: "robots", content: "noindex" }] }),
  component: ExamsPage,
});

function ExamsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listExams);
  const classesFn = useServerFn(listMyClasses);
  const saveFn = useServerFn(saveExam);
  const resultsFn = useServerFn(getExamResults);
  const marksFn = useServerFn(saveExamMarks);
  const publishFn = useServerFn(publishExam);
  const ctxFn = useServerFn(getTeacherContext);

  const { data: exams } = useQuery({ queryKey: ["teacher", "exams"], queryFn: () => listFn() });
  const { data: classes } = useQuery({ queryKey: ["teacher", "classes"], queryFn: () => classesFn() });
  const { data: schoolCtx } = useQuery({ queryKey: ["teacher", "context"], queryFn: () => ctxFn() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ class_id: "", subject_id: "", title: "", exam_date: "", max_score: 100, term: "", exam_kind: "document" as "document" | "quiz" });
  const [selectedExam, setSelectedExam] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"marks" | "questions">("marks");

  const distinctClasses = useMemo(() => {
    const seen = new Set<string>();
    return ((classes ?? []) as any[]).filter((r) => (seen.has(r.class_id) ? false : (seen.add(r.class_id), true)));
  }, [classes]);
  const subjectsForClass = ((classes ?? []) as any[]).filter((r) => r.class_id === form.class_id);

  const save = useMutation({
    mutationFn: () => saveFn({ data: {
      class_id: form.class_id,
      subject_id: form.subject_id || null,
      title: form.title,
      exam_date: form.exam_date || null,
      max_score: Number(form.max_score) || 100,
      term: form.term || schoolCtx?.current_term || null,
      exam_kind: form.exam_kind,
    } }),
    onSuccess: (res: any) => {
      toast.success("Examen créé");
      qc.invalidateQueries({ queryKey: ["teacher", "exams"] });
      setOpen(false);
      if (form.exam_kind === "quiz" && res?.id) { setSelectedExam(res.id); setTab("questions"); }
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const { data: examDetail } = useQuery({
    queryKey: ["teacher", "exam", selectedExam],
    queryFn: () => resultsFn({ data: { id: selectedExam! } }),
    enabled: Boolean(selectedExam),
  });

  const saveMarks = useMutation({
    mutationFn: () => marksFn({ data: {
      exam_id: selectedExam!,
      results: (examDetail?.students ?? []).map((s: any) => ({
        student_id: s.id,
        score: scores[s.id] !== undefined && scores[s.id] !== "" ? Number(scores[s.id]) : null,
        comment: null,
      })),
    } }),
    onSuccess: () => { toast.success("Notes enregistrées"); qc.invalidateQueries({ queryKey: ["teacher", "exam", selectedExam] }); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const publish = useMutation({
    mutationFn: () => publishFn({ data: { id: selectedExam! } }),
    onSuccess: () => { toast.success("Examen publié"); qc.invalidateQueries({ queryKey: ["teacher"] }); },
  });

  return (
    <TeacherShell
      title="Examens & notes"
      subtitle="Créez des examens, saisissez les notes et publiez les résultats"
      actions={<Button size="sm" className="gap-2" onClick={() => setOpen((v) => !v)}><Plus className="h-4 w-4" /> Nouvel examen</Button>}
    >
      {open && (
        <div className="rounded-2xl border border-border bg-background p-6 mb-6">
          <div className="grid sm:grid-cols-2 gap-3">
            <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.class_id} onChange={(e) => setForm((f) => ({ ...f, class_id: e.target.value, subject_id: "" }))}>
              <option value="">Classe…</option>
              {distinctClasses.map((r) => <option key={r.class_id} value={r.class_id}>{r.classes.name}</option>)}
            </select>
            <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.subject_id} onChange={(e) => setForm((f) => ({ ...f, subject_id: e.target.value }))}>
              <option value="">Matière (opt.)</option>
              {subjectsForClass.map((r) => <option key={r.subject_id} value={r.subject_id}>{r.subjects?.name}</option>)}
            </select>
            <input className="rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Titre" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <input type="date" className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.exam_date} onChange={(e) => setForm((f) => ({ ...f, exam_date: e.target.value }))} />
            <input type="number" className="rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Note max." value={form.max_score} onChange={(e) => setForm((f) => ({ ...f, max_score: Number(e.target.value) }))} />
            <input className="rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Trimestre (ex. T1)" value={form.term || (schoolCtx?.current_term ?? "")} onChange={(e) => setForm((f) => ({ ...f, term: e.target.value }))} />
            <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.exam_kind} onChange={(e) => setForm((f) => ({ ...f, exam_kind: e.target.value as "document" | "quiz" }))}>
              <option value="document">Examen sur document</option>
              <option value="quiz">Questionnaire en ligne</option>
            </select>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
            <Button disabled={!form.class_id || !form.title || save.isPending} onClick={() => save.mutate()}>Créer</Button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 rounded-2xl border border-border bg-background p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-3">Mes examens</h2>
          {((exams ?? []) as any[]).length === 0 ? (
            <div className="text-sm text-muted-foreground p-6 text-center"><FileText className="h-6 w-6 mx-auto opacity-50 mb-2" />Aucun examen</div>
          ) : (
            <ul className="space-y-1">
              {((exams ?? []) as any[]).map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => { setSelectedExam(e.id); setScores({}); setTab(e.exam_kind === "quiz" ? "questions" : "marks"); }}
                    className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${selectedExam === e.id ? "bg-primary/10 border border-primary/30" : "hover:bg-secondary"}`}
                  >
                    <div className="font-medium">{e.title}</div>
                    <div className="text-xs text-muted-foreground">{e.classes?.name} · {e.subjects?.name ?? "—"}</div>
                    <div className="text-xs mt-1 flex gap-1 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full bg-secondary">{e.status}</span>
                      {e.exam_kind === "quiz" && <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">questionnaire</span>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-border bg-background p-6">
          {!selectedExam ? (
            <div className="text-sm text-muted-foreground">Sélectionnez un examen pour saisir les notes.</div>
          ) : !examDetail ? (
            <div className="text-sm text-muted-foreground">Chargement…</div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{examDetail.exam?.title}</h3>
                  <p className="text-xs text-muted-foreground">Note max : {examDetail.exam?.max_score}</p>
                </div>
                <div className="flex gap-2">
                  {tab === "marks" && (
                    <Button size="sm" className="gap-2" disabled={saveMarks.isPending} onClick={() => saveMarks.mutate()}><Save className="h-4 w-4" /> Enregistrer</Button>
                  )}
                  <Button size="sm" variant="secondary" className="gap-2" onClick={() => publish.mutate()}><Send className="h-4 w-4" /> Publier</Button>
                </div>
              </div>
              <div className="mb-4 inline-flex rounded-lg border border-border p-1 text-sm">
                <button className={`px-3 py-1.5 rounded-md ${tab === "marks" ? "bg-secondary font-medium" : "text-muted-foreground"}`} onClick={() => setTab("marks")}>Notes</button>
                <button className={`px-3 py-1.5 rounded-md ${tab === "questions" ? "bg-secondary font-medium" : "text-muted-foreground"}`} onClick={() => setTab("questions")}>Questions</button>
              </div>
              {tab === "questions" ? (
                <ExamQuestionEditor exam={examDetail.exam} />
              ) : (
              <div className="overflow-hidden rounded-xl border border-border">
                <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-secondary/40 text-left">
                    <tr>
                      <th className="px-4 py-2 font-medium">Élève</th>
                      <th className="px-4 py-2 font-medium w-40">Note (/{examDetail.exam?.max_score})</th>
                      <th className="px-4 py-2 font-medium">Actuelle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(examDetail.students ?? []).map((s: any) => {
                      const existing = (examDetail.results ?? []).find((r: any) => r.student_id === s.id);
                      return (
                        <tr key={s.id}>
                          <td className="px-4 py-2">{s.last_name} {s.first_name}</td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm"
                              value={scores[s.id] ?? (existing?.score ?? "")}
                              onChange={(e) => setScores((p) => ({ ...p, [s.id]: e.target.value }))}
                            />
                          </td>
                          <td className="px-4 py-2 text-muted-foreground text-xs">
                            {existing ? `${existing.score} · ${existing.grade} · #${existing.position}` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table></div>
              </div>
              )}
            </>
          )}
        </div>
      </div>
    </TeacherShell>
  );
}