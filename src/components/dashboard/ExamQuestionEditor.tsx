import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Check, ListOrdered, Plus, Save, Shuffle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  listExamQuestions, saveExamQuestion, deleteExamQuestion, reorderExamQuestions, saveExam,
} from "@/lib/teacher.functions";

type Kind = "mcq" | "truefalse" | "short";

const KIND_LABEL: Record<Kind, string> = {
  mcq: "Choix multiple",
  truefalse: "Vrai / Faux",
  short: "Réponse courte",
};

type Draft = {
  id?: string;
  kind: Kind;
  prompt: string;
  options: string[];
  correct_answer: string;
  points: number;
};

function emptyDraft(kind: Kind = "mcq"): Draft {
  return {
    kind,
    prompt: "",
    options: kind === "mcq" ? ["", ""] : kind === "truefalse" ? ["Vrai", "Faux"] : [],
    correct_answer: kind === "truefalse" ? "Vrai" : "",
    points: 1,
  };
}

export function ExamQuestionEditor({ exam }: { exam: any }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listExamQuestions);
  const saveQFn = useServerFn(saveExamQuestion);
  const deleteQFn = useServerFn(deleteExamQuestion);
  const reorderFn = useServerFn(reorderExamQuestions);
  const saveExamFn = useServerFn(saveExam);

  const examId: string = exam.id;
  const { data: questions, isLoading } = useQuery({
    queryKey: ["teacher", "exam-questions", examId],
    queryFn: () => listFn({ data: { id: examId } }),
  });

  const rows = (questions ?? []) as any[];
  const totalPoints = useMemo(() => rows.reduce((s, q) => s + Number(q.points ?? 0), 0), [rows]);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [settings, setSettings] = useState({
    duration_minutes: exam.duration_minutes ?? "",
    available_from: exam.available_from ? String(exam.available_from).slice(0, 16) : "",
    available_to: exam.available_to ? String(exam.available_to).slice(0, 16) : "",
    randomize: Boolean(exam.randomize),
  });

  useEffect(() => {
    setDraft(null);
    setSettings({
      duration_minutes: exam.duration_minutes ?? "",
      available_from: exam.available_from ? String(exam.available_from).slice(0, 16) : "",
      available_to: exam.available_to ? String(exam.available_to).slice(0, 16) : "",
      randomize: Boolean(exam.randomize),
    });
  }, [examId]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["teacher", "exam-questions", examId] });

  const saveQuestion = useMutation({
    mutationFn: async () => {
      const d = draft!;
      const options = d.kind === "mcq" ? d.options.map((o) => o.trim()).filter(Boolean)
        : d.kind === "truefalse" ? ["Vrai", "Faux"] : [];
      if (!d.prompt.trim()) throw new Error("L'énoncé est requis");
      if (d.kind === "mcq") {
        if (options.length < 2) throw new Error("Au moins deux propositions sont requises");
        if (!options.includes(d.correct_answer.trim())) throw new Error("Sélectionnez la bonne réponse");
      }
      if (d.kind === "truefalse" && !["Vrai", "Faux"].includes(d.correct_answer)) {
        throw new Error("Sélectionnez Vrai ou Faux");
      }
      return saveQFn({ data: {
        id: d.id,
        exam_id: examId,
        kind: d.kind,
        prompt: d.prompt.trim(),
        options,
        correct_answer: d.correct_answer.trim() || null,
        points: Number(d.points) || 1,
        order_index: d.id
          ? (rows.find((q) => q.id === d.id)?.order_index ?? rows.length)
          : rows.length,
      } });
    },
    onSuccess: () => { toast.success("Question enregistrée"); setDraft(null); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const removeQuestion = useMutation({
    mutationFn: (id: string) => deleteQFn({ data: { id } }),
    onSuccess: () => { toast.success("Question supprimée"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const move = useMutation({
    mutationFn: async (payload: { index: number; dir: -1 | 1 }) => {
      const next = [...rows];
      const target = payload.index + payload.dir;
      if (target < 0 || target >= next.length) return { ok: true };
      [next[payload.index], next[target]] = [next[target], next[payload.index]];
      return reorderFn({ data: { exam_id: examId, order: next.map((q, i) => ({ id: q.id, order_index: i })) } });
    },
    onSuccess: () => invalidate(),
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const saveSettings = useMutation({
    mutationFn: () => saveExamFn({ data: {
      id: examId,
      class_id: exam.class_id,
      subject_id: exam.subject_id ?? null,
      title: exam.title,
      exam_date: exam.exam_date ?? null,
      max_score: Number(exam.max_score) || 100,
      term: exam.term ?? null,
      exam_kind: "quiz" as const,
      document_url: exam.document_url ?? null,
      duration_minutes: settings.duration_minutes === "" ? null : Number(settings.duration_minutes),
      available_from: settings.available_from ? new Date(settings.available_from).toISOString() : null,
      available_to: settings.available_to ? new Date(settings.available_to).toISOString() : null,
      randomize: settings.randomize,
    } }),
    onSuccess: () => { toast.success("Paramètres du questionnaire enregistrés"); qc.invalidateQueries({ queryKey: ["teacher", "exams"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h4 className="text-sm font-semibold uppercase tracking-wider">Paramètres du questionnaire</h4>
          <Button size="sm" variant="secondary" className="gap-2" disabled={saveSettings.isPending} onClick={() => saveSettings.mutate()}>
            <Save className="h-4 w-4" /> Enregistrer
          </Button>
        </div>
        <div className="mt-4 grid sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor="dur">Durée (minutes)</Label>
            <Input id="dur" type="number" min={1} value={settings.duration_minutes}
              onChange={(e) => setSettings((s) => ({ ...s, duration_minutes: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="from">Ouverture</Label>
            <Input id="from" type="datetime-local" value={settings.available_from}
              onChange={(e) => setSettings((s) => ({ ...s, available_from: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to">Fermeture</Label>
            <Input id="to" type="datetime-local" value={settings.available_to}
              onChange={(e) => setSettings((s) => ({ ...s, available_to: e.target.value }))} />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Switch id="rand" checked={settings.randomize} onCheckedChange={(v) => setSettings((s) => ({ ...s, randomize: v }))} />
          <Label htmlFor="rand" className="flex items-center gap-2">
            <Shuffle className="h-4 w-4" /> Ordre des questions aléatoire pour chaque élève
          </Label>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <h4 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
            <ListOrdered className="h-4 w-4" /> Questions
            <span className="text-xs font-normal text-muted-foreground">
              {rows.length} question(s) · {totalPoints} point(s)
            </span>
          </h4>
          <Button size="sm" className="gap-2" onClick={() => setDraft(emptyDraft())}>
            <Plus className="h-4 w-4" /> Ajouter une question
          </Button>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Chargement…</div>
        ) : rows.length === 0 && !draft ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Aucune question. Ajoutez des questions à choix multiple, vrai/faux ou à réponse courte.
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((q, i) => (
              <li key={q.id} className="rounded-xl border border-border p-4">
                {draft && draft.id === q.id ? (
                  <QuestionForm draft={draft} setDraft={setDraft} onSave={() => saveQuestion.mutate()} saving={saveQuestion.isPending} />
                ) : (
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-secondary text-xs flex items-center justify-center font-medium">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                        <span className="px-2 py-0.5 rounded-full bg-secondary">{KIND_LABEL[q.kind as Kind] ?? q.kind}</span>
                        <span>{q.points} pt(s)</span>
                      </div>
                      <p className="mt-1 font-medium break-words">{q.prompt}</p>
                      {(q.options ?? []).length > 0 && (
                        <ul className="mt-2 space-y-1 text-sm">
                          {(q.options as string[]).map((o, oi) => (
                            <li key={oi} className={`flex items-center gap-2 ${o === q.correct_answer ? "text-primary font-medium" : "text-muted-foreground"}`}>
                              {o === q.correct_answer ? <Check className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5" />}
                              {o}
                            </li>
                          ))}
                        </ul>
                      )}
                      {q.kind === "short" && q.correct_answer && (
                        <p className="mt-2 text-sm text-muted-foreground">Réponse attendue : <span className="text-primary font-medium">{q.correct_answer}</span></p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" aria-label="Monter la question" disabled={i === 0 || move.isPending} onClick={() => move.mutate({ index: i, dir: -1 })}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label="Descendre la question" disabled={i === rows.length - 1 || move.isPending} onClick={() => move.mutate({ index: i, dir: 1 })}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => setDraft({
                          id: q.id,
                          kind: q.kind as Kind,
                          prompt: q.prompt,
                          options: (q.options ?? []) as string[],
                          correct_answer: q.correct_answer ?? "",
                          points: Number(q.points ?? 1),
                        })}>Modifier</Button>
                        <Button size="icon" variant="ghost" aria-label="Supprimer la question" onClick={() => removeQuestion.mutate(q.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            ))}
            {draft && !draft.id && (
              <li className="rounded-xl border border-primary/40 bg-primary/5 p-4">
                <QuestionForm draft={draft} setDraft={setDraft} onSave={() => saveQuestion.mutate()} saving={saveQuestion.isPending} />
              </li>
            )}
          </ul>
        )}
      </section>
    </div>
  );
}

function QuestionForm({
  draft, setDraft, onSave, saving,
}: { draft: Draft; setDraft: (d: Draft | null) => void; onSave: () => void; saving: boolean }) {
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });

  function changeKind(kind: Kind) {
    setDraft({
      ...draft,
      kind,
      options: kind === "mcq" ? (draft.options.length ? draft.options : ["", ""]) : kind === "truefalse" ? ["Vrai", "Faux"] : [],
      correct_answer: kind === "truefalse" ? "Vrai" : kind === "mcq" ? draft.correct_answer : draft.correct_answer,
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label>Type</Label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draft.kind}
            onChange={(e) => changeKind(e.target.value as Kind)}
          >
            <option value="mcq">Choix multiple</option>
            <option value="truefalse">Vrai / Faux</option>
            <option value="short">Réponse courte</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label>Points</Label>
          <Input type="number" min={0} step="0.5" value={draft.points} onChange={(e) => set({ points: Number(e.target.value) })} />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Énoncé</Label>
        <Textarea rows={2} value={draft.prompt} onChange={(e) => set({ prompt: e.target.value })} placeholder="Posez votre question…" />
      </div>

      {draft.kind === "mcq" && (
        <div className="space-y-2">
          <Label>Propositions (cochez la bonne réponse)</Label>
          {draft.options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name={`correct-${draft.id ?? "new"}`}
                aria-label={`Bonne réponse : proposition ${i + 1}`}
                checked={Boolean(o) && draft.correct_answer === o}
                onChange={() => set({ correct_answer: o })}
              />
              <Input
                value={o}
                placeholder={`Proposition ${i + 1}`}
                onChange={(e) => {
                  const options = [...draft.options];
                  const prev = options[i];
                  options[i] = e.target.value;
                  set({ options, correct_answer: draft.correct_answer === prev ? e.target.value : draft.correct_answer });
                }}
              />
              <Button
                size="icon" variant="ghost" aria-label={`Supprimer la proposition ${i + 1}`}
                disabled={draft.options.length <= 2}
                onClick={() => set({ options: draft.options.filter((_, x) => x !== i) })}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button size="sm" variant="outline" className="gap-2" onClick={() => set({ options: [...draft.options, ""] })}>
            <Plus className="h-4 w-4" /> Proposition
          </Button>
        </div>
      )}

      {draft.kind === "truefalse" && (
        <div className="space-y-1">
          <Label>Bonne réponse</Label>
          <div className="flex gap-2">
            {["Vrai", "Faux"].map((v) => (
              <Button key={v} size="sm" variant={draft.correct_answer === v ? "default" : "outline"} onClick={() => set({ correct_answer: v })}>{v}</Button>
            ))}
          </div>
        </div>
      )}

      {draft.kind === "short" && (
        <div className="space-y-1">
          <Label>Réponse attendue (optionnel)</Label>
          <Input value={draft.correct_answer} onChange={(e) => set({ correct_answer: e.target.value })} placeholder="Utilisée pour la correction" />
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>Annuler</Button>
        <Button size="sm" className="gap-2" disabled={saving} onClick={onSave}>
          <Save className="h-4 w-4" /> {draft.id ? "Mettre à jour" : "Ajouter"}
        </Button>
      </div>
    </div>
  );
}