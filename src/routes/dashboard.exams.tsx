import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Send, ListChecks, Printer } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Panel, Field, Modal, StatusBadge } from "@/components/dashboard/admin-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listExams, saveExam, deleteExam, publishExam, getExamResults, saveExamResults,
  getClassReportCards, listReferenceData,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/dashboard/exams")({
  head: () => ({
    meta: [
      { title: "Examens — SmartSchool RDC" },
      { name: "description", content: "Créez les examens, saisissez les notes, publiez les résultats et générez les bulletins de classe." },
      { property: "og:title", content: "Gestion des examens — SmartSchool RDC" },
      { property: "og:description", content: "Examens, notes, résultats publiés et bulletins par classe." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ExamsPage,
});

const sel = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
const empty = { id: undefined as string | undefined, title: "", class_id: "", subject_id: "", exam_date: "", max_score: 20, term: "" };

function ExamsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listExams);
  const refFn = useServerFn(listReferenceData);
  const saveFn = useServerFn(saveExam);
  const delFn = useServerFn(deleteExam);
  const pubFn = useServerFn(publishExam);
  const resultsFn = useServerFn(getExamResults);
  const saveResultsFn = useServerFn(saveExamResults);
  const reportFn = useServerFn(getClassReportCards);

  const { data: exams, isLoading } = useQuery({ queryKey: ["admin", "exams"], queryFn: () => listFn() });
  const { data: refs } = useQuery({ queryKey: ["admin", "refs"], queryFn: () => refFn() });

  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [reportClass, setReportClass] = useState("");
  const [report, setReport] = useState<any>(null);

  const { data: marking } = useQuery({
    queryKey: ["admin", "exam-results", markingId],
    queryFn: () => resultsFn({ data: { id: markingId as string } }),
    enabled: Boolean(markingId),
  });

  useEffect(() => {
    if (!marking) return;
    const next: Record<string, string> = {};
    for (const s of marking.students as any[]) next[s.id] = "";
    for (const r of marking.results as any[]) next[r.student_id] = r.score === null ? "" : String(r.score);
    setScores(next);
  }, [marking]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "exams"] });
    qc.invalidateQueries({ queryKey: ["admin", "exam-results"] });
  };

  const save = useMutation({
    mutationFn: () => saveFn({
      data: {
        id: form.id,
        title: form.title,
        class_id: form.class_id,
        subject_id: form.subject_id || null,
        exam_date: form.exam_date || null,
        max_score: Number(form.max_score),
        term: form.term || null,
      },
    }),
    onSuccess: () => { toast.success("Examen enregistré"); setOpen(false); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Examen supprimé"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const publish = useMutation({
    mutationFn: (v: { id: string; status: "draft" | "published" }) => pubFn({ data: v }),
    onSuccess: () => { toast.success("Statut mis à jour"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const saveMarks = useMutation({
    mutationFn: () => saveResultsFn({
      data: {
        examId: markingId as string,
        entries: Object.entries(scores).map(([student_id, v]) => ({
          student_id,
          score: v === "" ? null : Number(v),
          comment: null,
        })),
      },
    }),
    onSuccess: () => { toast.success("Notes enregistrées"); setMarkingId(null); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const loadReport = useMutation({
    mutationFn: () => reportFn({ data: { classId: reportClass } }),
    onSuccess: (d) => setReport(d),
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  return (
    <DashboardShell title="Examens" subtitle="Évaluations, notes et bulletins">
      <Panel
        title={`${(exams ?? []).length} examen(s)`}
        actions={<Button onClick={() => { setForm(empty); setOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Créer un examen</Button>}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 pr-3">Titre</th><th className="py-2 pr-3">Classe</th>
                <th className="py-2 pr-3">Matière</th><th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Sur</th><th className="py-2 pr-3">Période</th>
                <th className="py-2 pr-3">Statut</th><th className="py-2 pr-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">Chargement…</td></tr>}
              {!isLoading && (exams ?? []).length === 0 && <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">Aucun examen.</td></tr>}
              {((exams ?? []) as any[]).map((e) => (
                <tr key={e.id} className="border-b border-border/60 hover:bg-secondary/40">
                  <td className="py-2 pr-3 font-medium">{e.title}</td>
                  <td className="py-2 pr-3">{e.classes?.name ?? "—"}</td>
                  <td className="py-2 pr-3">{e.subjects?.name ?? "—"}</td>
                  <td className="py-2 pr-3">{e.exam_date ?? "—"}</td>
                  <td className="py-2 pr-3">{e.max_score}</td>
                  <td className="py-2 pr-3">{e.term ?? "—"}</td>
                  <td className="py-2 pr-3"><StatusBadge value={e.status} /></td>
                  <td className="py-2 pr-3">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" title="Saisir les notes" onClick={() => setMarkingId(e.id)}><ListChecks className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title={e.status === "published" ? "Repasser en brouillon" : "Publier les résultats"}
                        onClick={() => publish.mutate({ id: e.id, status: e.status === "published" ? "draft" : "published" })}>
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" title="Modifier" onClick={() => {
                        setForm({
                          id: e.id, title: e.title, class_id: e.class_id, subject_id: e.subject_id ?? "",
                          exam_date: e.exam_date ?? "", max_score: Number(e.max_score), term: e.term ?? "",
                        });
                        setOpen(true);
                      }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Supprimer" onClick={() => { if (confirm("Supprimer cet examen ?")) remove.mutate(e.id); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="mt-6">
        <Panel title="Bulletins de classe">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-56">
              <Field label="Classe">
                <select className={sel} value={reportClass} onChange={(e) => setReportClass(e.target.value)}>
                  <option value="">Sélectionner…</option>
                  {((refs?.classes ?? []) as any[]).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
            </div>
            <Button variant="outline" onClick={() => loadReport.mutate()} disabled={!reportClass || loadReport.isPending}>Générer</Button>
            {report && <Button variant="outline" className="gap-2" onClick={() => window.print()}><Printer className="h-4 w-4" /> Imprimer / PDF</Button>}
          </div>

          {report && (
            <div className="mt-5 space-y-2">
              <div className="text-sm">
                <strong>{report.school?.name}</strong> — {report.klass?.name} · {report.school?.academic_year ?? ""} {report.school?.current_term ?? ""}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="py-2 pr-3">Élève</th>
                      {((report.exams ?? []) as any[]).map((e: any) => <th key={e.id} className="py-2 pr-3">{e.subjects?.name ?? e.title}</th>)}
                      <th className="py-2 pr-3">Moyenne</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((report.students ?? []) as any[]).map((s: any) => {
                      const rows = ((report.exams ?? []) as any[]).map((e: any) => {
                        const r = (report.results as any[]).find((x) => x.exam_id === e.id && x.student_id === s.id);
                        return r?.score === null || r?.score === undefined ? null : { score: Number(r.score), max: Number(e.max_score) };
                      });
                      const valid = rows.filter(Boolean) as { score: number; max: number }[];
                      const avg = valid.length ? (valid.reduce((a, r) => a + (r.score / r.max) * 100, 0) / valid.length).toFixed(1) : "—";
                      return (
                        <tr key={s.id} className="border-b border-border/60">
                          <td className="py-2 pr-3 font-medium">{s.last_name} {s.first_name}</td>
                          {rows.map((r, i) => <td key={i} className="py-2 pr-3">{r ? `${r.score}/${r.max}` : "—"}</td>)}
                          <td className="py-2 pr-3 font-semibold">{avg === "—" ? "—" : `${avg}%`}</td>
                        </tr>
                      );
                    })}
                    {(report.students ?? []).length === 0 && <tr><td className="py-6 text-center text-muted-foreground" colSpan={3}>Aucun élève.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={form.id ? "Modifier l'examen" : "Créer un examen"}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.title || !form.class_id}>Enregistrer</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Titre"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Classe">
            <select className={sel} value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}>
              <option value="">—</option>
              {((refs?.classes ?? []) as any[]).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Matière">
            <select className={sel} value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })}>
              <option value="">—</option>
              {((refs?.subjects ?? []) as any[]).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Date"><Input type="date" value={form.exam_date} onChange={(e) => setForm({ ...form, exam_date: e.target.value })} /></Field>
          <Field label="Note maximale"><Input type="number" value={form.max_score} onChange={(e) => setForm({ ...form, max_score: Number(e.target.value) })} /></Field>
          <Field label="Période"><Input placeholder="1er trimestre" value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} /></Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(markingId)}
        onOpenChange={() => setMarkingId(null)}
        wide
        title={marking ? `Notes — ${(marking.exam as any).title}` : "Notes"}
        footer={
          <>
            <Button variant="outline" onClick={() => setMarkingId(null)}>Annuler</Button>
            <Button onClick={() => saveMarks.mutate()} disabled={saveMarks.isPending}>Enregistrer les notes</Button>
          </>
        }
      >
        {marking && (
          <div className="max-h-[55vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3">Élève</th><th className="py-2 pr-3">Note / {(marking.exam as any).max_score}</th>
                </tr>
              </thead>
              <tbody>
                {((marking.students ?? []) as any[]).map((s) => (
                  <tr key={s.id} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-medium">{s.last_name} {s.first_name}</td>
                    <td className="py-2 pr-3 w-40">
                      <Input
                        type="number"
                        value={scores[s.id] ?? ""}
                        onChange={(e) => setScores((sc) => ({ ...sc, [s.id]: e.target.value }))}
                      />
                    </td>
                  </tr>
                ))}
                {(marking.students ?? []).length === 0 && <tr><td colSpan={2} className="py-6 text-center text-muted-foreground">Aucun élève dans cette classe.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </DashboardShell>
  );
}
