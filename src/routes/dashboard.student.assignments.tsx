import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StudentShell } from "@/components/dashboard/StudentShell";
import { listStudentAssignments, submitAssignment, prepareSubmissionUpload, getMySubmissionFileLink } from "@/lib/student.functions";
import { uploadWithProgress } from "@/lib/storage-upload";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle2, Clock, FileText } from "lucide-react";
import { toast } from "sonner";
import { SUBMISSION_EXTENSIONS, validateFile } from "@/lib/lms";

export const Route = createFileRoute("/dashboard/student/assignments")({ component: AssignmentsPage });

function AssignmentsPage() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["student-assignments"],
    queryFn: () => listStudentAssignments(),
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  async function openMyFile(submissionId: string) {
    try {
      const r: any = await getMySubmissionFileLink({ data: { submission_id: submissionId } });
      window.open(r.url, "_blank", "noopener");
    } catch (e) {
      console.error("[student-assignments] file access failed", e);
      toast.error("Impossible d'ouvrir ce fichier. Veuillez réessayer.");
    }
  }

  const submit = useMutation({
    mutationFn: (p: any) => submitAssignment({ data: p }),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ["student-assignments"] });
      qc.invalidateQueries({ queryKey: ["student-overview"] });
      toast.success(r?.is_late ? "Travail envoyé (remise tardive)" : "Votre travail a été envoyé avec succès.");
      setOpenId(null); setContent("");
    },
    onError: (e: any) => toast.error(e?.message || "Votre remise n'a pas pu être enregistrée. Réessayez."),
  });

  async function handleSubmit(assignmentId: string, file: File | null) {
    setBusy(true);
    try {
      let filePayload: {
        file_path?: string | null;
        file_name?: string | null;
        file_type?: string | null;
        file_size?: number | null;
      } = {};
      if (file) {
        const err = validateFile(file, SUBMISSION_EXTENSIONS);
        if (err) { toast.error(err); return; }
        const prep = await prepareSubmissionUpload({ data: { assignment_id: assignmentId, file_name: file.name } });
        setProgress(0);
        await uploadWithProgress(prep.bucket, prep.path, file, setProgress);
        filePayload = {
          file_path: prep.path,
          file_name: file.name,
          file_type: file.type || null,
          file_size: file.size,
        };
      }
      await submit.mutateAsync({ assignment_id: assignmentId, content: content || null, ...filePayload });
    } catch (e: any) {
      toast.error(e?.message || "Votre remise n'a pas pu être envoyée. Vérifiez votre connexion et réessayez.");
    } finally { setBusy(false); setProgress(null); }
  }

  return (
    <StudentShell title="Devoirs" subtitle={`${data.length} devoir(s)`}>
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-secondary/40 animate-pulse" />
        ))}</div>
      ) : data.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">Aucun devoir pour le moment.</div>
      ) : (
        <div className="space-y-3">
          {data.map((a: any) => {
            const sub = a.submission;
            const overdue = a.due_date && new Date(a.due_date) < new Date() && !sub;
            return (
              <div key={a.id} className="rounded-2xl border border-border bg-background/70 backdrop-blur-sm p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{a.title}</h3>
                      {a.subjects?.name && <Badge variant="secondary">{a.subjects.name}</Badge>}
                      {sub ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Rendu</Badge>
                      ) : overdue ? (
                        <Badge variant="destructive">En retard</Badge>
                      ) : (
                        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"><Clock className="h-3 w-3 mr-1" />À rendre</Badge>
                      )}
                    </div>
                    {a.instructions && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{a.instructions}</p>}
                    <div className="text-xs text-muted-foreground mt-2">
                      Échéance: {a.due_date ? new Date(a.due_date).toLocaleString() : "—"}
                      {a.teachers && ` · ${a.teachers.first_name} ${a.teachers.last_name}`}
                    </div>
                    {Array.isArray(a.attachments) && a.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {a.attachments.map((f: any, i: number) => (
                          <a key={i} href={f.url} target="_blank" rel="noreferrer" className="text-xs inline-flex items-center gap-1 rounded-md border px-2 py-1 hover:bg-secondary">
                            <FileText className="h-3 w-3" /> {f.name}
                          </a>
                        ))}
                      </div>
                    )}
                    {sub && (
                      <div className="mt-3 rounded-lg bg-secondary/50 p-3 text-sm">
                        <div className="text-xs text-muted-foreground">Remis le {new Date(sub.submitted_at).toLocaleString("fr-FR")}{sub.is_late ? " · en retard" : ""}</div>
                        {sub.content && <div className="whitespace-pre-wrap">{sub.content}</div>}
                        {sub.file_path && (
                          <button type="button" className="text-primary underline text-xs" onClick={() => openMyFile(sub.id)}>
                            {sub.file_name ?? "Voir le fichier"}
                          </button>
                        )}
                        {sub.grade !== null && <div className="mt-1 text-xs">Note: <strong>{sub.grade}</strong></div>}
                        {sub.feedback && <div className="mt-1 text-xs italic">Retour: {sub.feedback}</div>}
                      </div>
                    )}
                  </div>
                  <Button size="sm" variant={sub ? "outline" : "default"} onClick={() => { setOpenId(openId === a.id ? null : a.id); setContent(sub?.content ?? ""); }}>
                    {sub ? "Modifier" : "Envoyer"}
                  </Button>
                </div>
                {openId === a.id && (
                  <div className="mt-4 space-y-3">
                    <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Votre réponse…" rows={4} />
                    <label className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-dashed border-primary/40 px-3 py-3 text-sm text-primary cursor-pointer active:bg-primary/5">
                      <Upload className="h-4 w-4 shrink-0" />
                      <span className="min-w-0">Joindre un fichier (PDF, Word, PowerPoint, Excel, image, ZIP — max 50 Mo)</span>
                      <input type="file" hidden disabled={busy} onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        e.target.value = "";
                        handleSubmit(a.id, f);
                      }} />
                    </label>
                    {progress !== null && (
                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" className="h-11 sm:h-9" disabled={busy || submit.isPending} onClick={() => handleSubmit(a.id, null)}>Envoyer texte</Button>
                      <Button size="sm" className="h-11 sm:h-9" variant="ghost" onClick={() => setOpenId(null)}>Annuler</Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </StudentShell>
  );
}