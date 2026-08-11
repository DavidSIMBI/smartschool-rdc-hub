import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarCheck, Save } from "lucide-react";
import { toast } from "sonner";
import { TeacherShell } from "@/components/dashboard/TeacherShell";
import { Button } from "@/components/ui/button";
import { listMyClasses, saveAttendance, listAttendanceHistory, getClassDetail } from "@/lib/teacher.functions";

export const Route = createFileRoute("/dashboard/teacher/attendance")({
  head: () => ({ meta: [{ title: "Présences — Enseignant" }, { name: "robots", content: "noindex" }] }),
  component: AttendancePage,
});

type Status = "present" | "absent" | "late" | "excused";

function AttendancePage() {
  const qc = useQueryClient();
  const classesFn = useServerFn(listMyClasses);
  const classDetailFn = useServerFn(getClassDetail);
  const historyFn = useServerFn(listAttendanceHistory);
  const saveFn = useServerFn(saveAttendance);

  const { data: classes } = useQuery({ queryKey: ["teacher", "classes"], queryFn: () => classesFn() });
  const { data: history } = useQuery({ queryKey: ["teacher", "attendance", "history"], queryFn: () => historyFn() });

  const distinctClasses = useMemo(() => {
    const seen = new Set<string>();
    return ((classes ?? []) as any[]).filter((r) => {
      if (!r.classes) return false;
      if (seen.has(r.class_id)) return false;
      seen.add(r.class_id);
      return true;
    });
  }, [classes]);

  const [classId, setClassId] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState<string>("");
  const [statuses, setStatuses] = useState<Record<string, Status>>({});

  const subjectsForClass = ((classes ?? []) as any[]).filter((r) => r.class_id === classId);

  const { data: detail } = useQuery({
    queryKey: ["teacher", "class-detail", classId],
    queryFn: () => classDetailFn({ data: { id: classId } }),
    enabled: Boolean(classId),
  });

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          class_id: classId,
          subject_id: subjectId || null,
          session_date: date,
          notes,
          records: (detail?.students ?? []).map((s: any) => ({
            student_id: s.id,
            status: statuses[s.id] ?? "present",
          })),
        },
      }),
    onSuccess: () => {
      toast.success("Présences enregistrées");
      qc.invalidateQueries({ queryKey: ["teacher"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  return (
    <TeacherShell title="Présences" subtitle="Prise de présence quotidienne">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-background p-6">
          <div className="grid sm:grid-cols-3 gap-3 mb-4">
            <Field label="Classe">
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={classId}
                onChange={(e) => { setClassId(e.target.value); setSubjectId(""); setStatuses({}); }}
              >
                <option value="">— Sélectionner —</option>
                {distinctClasses.map((r) => (
                  <option key={r.class_id} value={r.class_id}>{r.classes.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Matière (opt.)">
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                <option value="">—</option>
                {subjectsForClass.map((r) => (
                  <option key={r.subject_id} value={r.subject_id}>{r.subjects?.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Date">
              <input
                type="date"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
          </div>

          {classId && detail && (
            <>
              <div className="overflow-hidden rounded-xl border border-border">
                <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-secondary/40 text-left">
                    <tr>
                      <th className="px-4 py-2 font-medium">Élève</th>
                      <th className="px-4 py-2 font-medium">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(detail.students ?? []).map((s: any) => {
                      const cur = statuses[s.id] ?? "present";
                      return (
                        <tr key={s.id}>
                          <td className="px-4 py-2">{s.last_name} {s.first_name}</td>
                          <td className="px-4 py-2">
                            <div className="flex gap-1">
                              {(["present","absent","late","excused"] as Status[]).map((st) => (
                                <button
                                  key={st}
                                  onClick={() => setStatuses((p) => ({ ...p, [s.id]: st }))}
                                  className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                                    cur === st
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "border-border hover:bg-secondary"
                                  }`}
                                >
                                  {labelFor(st)}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {(detail.students ?? []).length === 0 && (
                      <tr><td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">Aucun élève dans cette classe.</td></tr>
                    )}
                  </tbody>
                </table></div>
              </div>

              <textarea
                placeholder="Notes de la session (optionnel)"
                className="mt-4 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <Button className="mt-4 gap-2" disabled={save.isPending || (detail.students ?? []).length === 0} onClick={() => save.mutate()}>
                <Save className="h-4 w-4" /> Enregistrer
              </Button>
            </>
          )}
          {!classId && (
            <div className="text-sm text-muted-foreground">Sélectionnez une classe pour commencer.</div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-background p-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarCheck className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider">Historique</h2>
          </div>
          <ul className="space-y-2">
            {((history ?? []) as any[]).slice(0, 20).map((h) => (
              <li key={h.id} className="text-sm p-3 rounded-lg bg-secondary/30">
                <div className="font-medium">{h.classes?.name ?? "—"} {h.subjects?.name ? `· ${h.subjects.name}` : ""}</div>
                <div className="text-xs text-muted-foreground">{new Date(h.session_date).toLocaleDateString("fr-FR")}</div>
              </li>
            ))}
            {((history ?? []) as any[]).length === 0 && (
              <li className="text-sm text-muted-foreground">Aucune session enregistrée.</li>
            )}
          </ul>
        </div>
      </div>
    </TeacherShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function labelFor(s: Status) {
  return s === "present" ? "Présent" : s === "absent" ? "Absent" : s === "late" ? "Retard" : "Excusé";
}