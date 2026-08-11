import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { GraduationCap, Download, Send, CheckCircle2, Clock, Eye, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TeacherShell } from "@/components/dashboard/TeacherShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatBytes } from "@/lib/lms";
import { listAssignments, listSubmissions, gradeSubmission, publishAssignmentGrades, getSubmissionFileLink } from "@/lib/teacher.functions";

export const Route = createFileRoute("/dashboard/teacher/grading")({
  head: () => ({
    meta: [
      { title: "Correction des devoirs — Enseignant" },
      { name: "description", content: "Consultez les remises, téléchargez les fichiers, notez et publiez les résultats." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GradingPage,
});

function GradingPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAssignments);
  const subsFn = useServerFn(listSubmissions);
  const gradeFn = useServerFn(gradeSubmission);
  const publishFn = useServerFn(publishAssignmentGrades);
  const linkFn = useServerFn(getSubmissionFileLink);
  const [busyFile, setBusyFile] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; name: string; type: string | null } | null>(null);

  async function openFile(submissionId: string, mode: "view" | "download") {
    setBusyFile(submissionId);
    try {
      const r = (await linkFn({ data: { submission_id: submissionId } })) as any;
      const type = (r.file_type ?? "") as string;
      const previewable = type.startsWith("image/") || type === "application/pdf" || /\.(pdf|png|jpe?g|webp|gif)$/i.test(r.file_name ?? "");
      if (mode === "view" && previewable) {
        setPreview({ url: r.url, name: r.file_name, type: r.file_type });
      } else {
        const a = document.createElement("a");
        a.href = `${r.url}&mode=download`;
        a.download = r.file_name ?? "remise";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (e) {
      console.error("[grading] submission file access failed", e);
      toast.error("Impossible d'ouvrir cette remise. Veuillez réessayer.");
    } finally {
      setBusyFile(null);
    }
  }

  const { data: assignments } = useQuery({ queryKey: ["teacher", "assignments"], queryFn: () => listFn() });
  const [selected, setSelected] = useState<string>("");
  const { data: detail } = useQuery({
    queryKey: ["teacher", "submissions", selected],
    queryFn: () => subsFn({ data: { id: selected } }),
    enabled: Boolean(selected),
  });

  const [draft, setDraft] = useState<Record<string, { grade: string; feedback: string }>>({});

  const grade = useMutation({
    mutationFn: (p: { submission_id: string; grade: number | null; feedback: string | null; publish: boolean }) => gradeFn({ data: p }),
    onSuccess: () => { toast.success("Correction enregistrée"); qc.invalidateQueries({ queryKey: ["teacher", "submissions", selected] }); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const publishAll = useMutation({
    mutationFn: () => publishFn({ data: { id: selected } }),
    onSuccess: (r: any) => { toast.success(`${r?.count ?? 0} note(s) publiée(s)`); qc.invalidateQueries({ queryKey: ["teacher", "submissions", selected] }); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const assignment = (detail as any)?.assignment;
  const submissions = ((detail as any)?.submissions ?? []) as any[];
  const students = ((detail as any)?.students ?? []) as any[];
  const byStudent: Record<string, any> = {};
  for (const s of submissions) byStudent[s.student_id] = s;

  return (
    <TeacherShell
      title="Correction des devoirs"
      subtitle="Consultez les remises, notez, commentez et publiez les résultats"
      actions={selected ? <Button size="sm" className="gap-2" disabled={publishAll.isPending} onClick={() => publishAll.mutate()}><Send className="h-4 w-4" /> Publier les notes</Button> : undefined}
    >
      <select
        className="mb-6 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">Choisir un devoir…</option>
        {((assignments ?? []) as any[]).map((a) => (
          <option key={a.id} value={a.id}>{a.title} — {a.classes?.name ?? "—"}</option>
        ))}
      </select>

      {!selected ? (
        <div className="rounded-2xl border border-dashed border-border bg-background p-10 text-center">
          <GraduationCap className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Sélectionnez un devoir pour voir les remises.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-background">
          <div className="px-4 py-3 bg-secondary/40 text-sm">
            {assignment?.title} · {assignment?.classes?.name ?? "—"} · Note max. {assignment?.max_score ?? 20}
            {assignment?.due_date ? ` · échéance ${new Date(assignment.due_date).toLocaleString("fr-FR")}` : ""}
            {assignment?.allow_late ? " · remises tardives autorisées" : ""}
          </div>
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
            <thead className="bg-secondary/20 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Élève</th>
                <th className="px-4 py-3 font-medium">Remise</th>
                <th className="px-4 py-3 font-medium">Fichier</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Note</th>
                <th className="px-4 py-3 font-medium">Commentaire</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map((st) => {
                const sub = byStudent[st.id];
                const d = draft[sub?.id ?? st.id] ?? {
                  grade: sub?.grade !== null && sub?.grade !== undefined ? String(sub.grade) : "",
                  feedback: sub?.feedback ?? "",
                };
                return (
                  <tr key={st.id} className="hover:bg-secondary/30 align-top">
                    <td className="px-4 py-3 font-medium">{st.last_name} {st.first_name}<div className="text-xs text-muted-foreground">{st.matricule ?? "—"}</div></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {sub ? (
                        <>
                          <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> {new Date(sub.submitted_at).toLocaleString("fr-FR")}</span>
                          {sub.is_late && <div className="text-amber-600">En retard</div>}
                          {sub.grade_published && <div className="text-emerald-600">Note publiée</div>}
                          {sub.content && <div className="mt-1 max-w-xs whitespace-pre-wrap text-foreground">{sub.content}</div>}
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> Non remis</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {sub?.file_path ? (
                        <div className="space-y-1 text-xs">
                          <div className="inline-flex items-center gap-1 font-medium"><FileText className="h-3 w-3" /> {sub.file_name ?? "Fichier"}</div>
                          <div className="text-muted-foreground">{sub.file_type ?? "type inconnu"} · {formatBytes(sub.file_size)}</div>
                          <div className="flex gap-1 pt-1">
                            <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" disabled={busyFile === sub.id} onClick={() => openFile(sub.id, "view")}>
                              {busyFile === sub.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />} Voir
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" disabled={busyFile === sub.id} onClick={() => openFile(sub.id, "download")}>
                              <Download className="h-3 w-3" /> Télécharger
                            </Button>
                          </div>
                        </div>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {sub ? (
                        <>
                          <div>{sub.grade_published ? "Rendu à l'élève" : sub.graded_at ? "Corrigé" : "Reçu"}</div>
                          <div className={sub.is_late ? "text-amber-600" : "text-emerald-600"}>{sub.is_late ? "En retard" : "À temps"}</div>
                        </>
                      ) : <span className="text-muted-foreground">Non remis</span>}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        disabled={!sub}
                        className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
                        value={d.grade}
                        onChange={(e) => setDraft((p) => ({ ...p, [sub?.id ?? st.id]: { ...d, grade: e.target.value } }))}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <textarea
                        disabled={!sub}
                        className="w-full min-w-[180px] rounded-md border border-input bg-background px-2 py-1 text-sm"
                        rows={2}
                        value={d.feedback}
                        onChange={(e) => setDraft((p) => ({ ...p, [sub?.id ?? st.id]: { ...d, feedback: e.target.value } }))}
                      />
                    </td>
                    <td className="px-4 py-3 text-right space-y-2">
                      <Button size="sm" variant="outline" disabled={!sub || grade.isPending} onClick={() => grade.mutate({ submission_id: sub.id, grade: d.grade === "" ? null : Number(d.grade), feedback: d.feedback || null, publish: false })}>
                        Enregistrer
                      </Button>
                      <Button size="sm" disabled={!sub || grade.isPending} onClick={() => grade.mutate({ submission_id: sub.id, grade: d.grade === "" ? null : Number(d.grade), feedback: d.feedback || null, publish: true })}>
                        Rendre
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        </div>
      )}

      <Dialog open={Boolean(preview)} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="truncate">{preview?.name}</DialogTitle>
          </DialogHeader>
          {preview && (
            (preview.type ?? "").startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(preview.name) ? (
              <img src={preview.url} alt={preview.name} className="max-h-[70vh] w-full rounded-lg object-contain" />
            ) : (
              <iframe src={preview.url} title={preview.name} className="h-[70vh] w-full rounded-lg border border-border" />
            )
          )}
          {preview && (
            <a href={`${preview.url}&mode=download`} download={preview.name} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <Download className="h-4 w-4" /> Télécharger le fichier
            </a>
          )}
        </DialogContent>
      </Dialog>
    </TeacherShell>
  );
}