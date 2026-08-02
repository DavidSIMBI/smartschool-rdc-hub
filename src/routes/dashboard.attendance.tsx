import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Panel, Field } from "@/components/dashboard/admin-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAttendanceSheet, saveAttendanceSheet, listAttendanceHistory, listReferenceData } from "@/lib/admin.functions";

export const Route = createFileRoute("/dashboard/attendance")({
  head: () => ({
    meta: [
      { title: "Présences — SmartSchool RDC" },
      { name: "description", content: "Marquez les présences par classe et par date, consultez l'historique et les rapports de présence." },
      { property: "og:title", content: "Gestion des présences — SmartSchool RDC" },
      { property: "og:description", content: "Feuilles de présence, historique et rapports par classe." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AttendancePage,
});

const sel = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
type Status = "present" | "absent" | "late" | "excused";
const statuses: { key: Status; label: string; cls: string }[] = [
  { key: "present", label: "Présent", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/40" },
  { key: "absent", label: "Absent", cls: "bg-red-500/10 text-red-600 border-red-500/40" },
  { key: "late", label: "Retard", cls: "bg-amber-500/10 text-amber-600 border-amber-500/40" },
  { key: "excused", label: "Excusé", cls: "bg-sky-500/10 text-sky-600 border-sky-500/40" },
];

function AttendancePage() {
  const qc = useQueryClient();
  const refFn = useServerFn(listReferenceData);
  const sheetFn = useServerFn(getAttendanceSheet);
  const saveFn = useServerFn(saveAttendanceSheet);
  const histFn = useServerFn(listAttendanceHistory);

  const { data: refs } = useQuery({ queryKey: ["admin", "refs"], queryFn: () => refFn() });
  const { data: history } = useQuery({ queryKey: ["admin", "attendance-history"], queryFn: () => histFn() });

  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [marks, setMarks] = useState<Record<string, Status>>({});

  const { data: sheet, isFetching } = useQuery({
    queryKey: ["admin", "attendance", classId, date],
    queryFn: () => sheetFn({ data: { classId, date } }),
    enabled: Boolean(classId && date),
  });

  useEffect(() => {
    if (!sheet) return;
    const next: Record<string, Status> = {};
    for (const s of sheet.students as any[]) next[s.id] = "present";
    for (const r of sheet.records as any[]) next[r.student_id] = r.status;
    setMarks(next);
    setNotes((sheet.session as any)?.notes ?? "");
  }, [sheet]);

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          classId,
          date,
          notes: notes || null,
          entries: Object.entries(marks).map(([student_id, status]) => ({ student_id, status })),
        },
      }),
    onSuccess: () => {
      toast.success("Présences enregistrées");
      qc.invalidateQueries({ queryKey: ["admin", "attendance"] });
      qc.invalidateQueries({ queryKey: ["admin", "attendance-history"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const bulk = (status: Status) =>
    setMarks(Object.fromEntries(((sheet?.students ?? []) as any[]).map((s) => [s.id, status])) as Record<string, Status>);

  return (
    <DashboardShell title="Présences" subtitle="Appel quotidien et rapports">
      <Panel title="Feuille de présence">
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <Field label="Classe">
            <select className={sel} value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">Sélectionner une classe</option>
              {((refs?.classes ?? []) as any[]).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <div className="flex items-end gap-2">
            {statuses.map((s) => (
              <Button key={s.key} size="sm" variant="outline" onClick={() => bulk(s.key)} disabled={!sheet}>
                Tous {s.label.toLowerCase()}
              </Button>
            ))}
          </div>
        </div>

        {!classId && <p className="py-6 text-center text-sm text-muted-foreground">Choisissez une classe et une date.</p>}
        {classId && isFetching && <p className="py-6 text-center text-sm text-muted-foreground">Chargement…</p>}
        {classId && !isFetching && (sheet?.students ?? []).length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">Aucun élève dans cette classe.</p>
        )}

        {((sheet?.students ?? []) as any[]).length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 pr-3">Élève</th><th className="py-2 pr-3">Matricule</th><th className="py-2 pr-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {((sheet?.students ?? []) as any[]).map((s) => (
                    <tr key={s.id} className="border-b border-border/60">
                      <td className="py-2 pr-3 font-medium">{s.last_name} {s.first_name}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{s.matricule ?? "—"}</td>
                      <td className="py-2 pr-3">
                        <div className="flex flex-wrap gap-1">
                          {statuses.map((st) => (
                            <button
                              key={st.key}
                              type="button"
                              onClick={() => setMarks((m) => ({ ...m, [s.id]: st.key }))}
                              className={`rounded-full border px-3 py-1 text-xs ${marks[s.id] === st.key ? st.cls : "border-border text-muted-foreground"}`}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <Field label="Notes de séance"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
              <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-2"><Save className="h-4 w-4" /> Enregistrer les présences</Button>
            </div>
          </>
        )}
      </Panel>

      <div className="mt-6">
        <Panel title="Historique & rapports">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Classe</th>
                  <th className="py-2 pr-3">Effectif</th><th className="py-2 pr-3">Présents</th>
                  <th className="py-2 pr-3">Absents</th><th className="py-2 pr-3">Retards</th>
                  <th className="py-2 pr-3">Excusés</th><th className="py-2 pr-3">Taux</th>
                </tr>
              </thead>
              <tbody>
                {((history ?? []) as any[]).map((h) => (
                  <tr key={h.id} className="border-b border-border/60">
                    <td className="py-2 pr-3">{h.session_date}</td>
                    <td className="py-2 pr-3">{h.classes?.name ?? "—"}</td>
                    <td className="py-2 pr-3">{h.total}</td>
                    <td className="py-2 pr-3 text-emerald-600">{h.present}</td>
                    <td className="py-2 pr-3 text-red-600">{h.absent}</td>
                    <td className="py-2 pr-3 text-amber-600">{h.late}</td>
                    <td className="py-2 pr-3 text-sky-600">{h.excused}</td>
                    <td className="py-2 pr-3 font-medium">{h.total ? Math.round((h.present / h.total) * 100) : 0}%</td>
                  </tr>
                ))}
                {(history ?? []).length === 0 && <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">Aucune séance enregistrée.</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </DashboardShell>
  );
}
