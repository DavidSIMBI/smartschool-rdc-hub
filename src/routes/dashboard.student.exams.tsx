import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { StudentShell } from "@/components/dashboard/StudentShell";
import { listStudentExams } from "@/lib/student.functions";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

export const Route = createFileRoute("/dashboard/student/exams")({ component: ExamsPage });

function ExamsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["student-exams"], queryFn: () => listStudentExams() });
  const exams: any[] = data?.exams ?? [];
  const results: any[] = data?.results ?? [];
  const byExam: Record<string, any> = {};
  for (const r of results) byExam[r.exam_id] = r;

  const chart = exams
    .filter((e) => e.status === "published" && byExam[e.id])
    .sort((a, b) => new Date(a.exam_date ?? 0).getTime() - new Date(b.exam_date ?? 0).getTime())
    .map((e) => {
      const r = byExam[e.id];
      const pct = r?.score ? Math.round((Number(r.score) / Number(e.max_score || 100)) * 100) : 0;
      return { name: (e.title ?? "").slice(0, 14), value: pct };
    });

  return (
    <StudentShell title="Examens" subtitle={`${exams.length} examen(s)`}>
      {chart.length > 0 && (
        <div className="rounded-2xl border border-border bg-background/70 backdrop-blur-sm p-5 mb-6">
          <h3 className="text-sm font-semibold mb-3">Performance (% du barème)</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis domain={[0, 100]} fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-secondary/40 animate-pulse" />)}</div>
      ) : exams.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">Aucun examen planifié.</div>
      ) : (
        <div className="rounded-2xl border border-border bg-background/70 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
            <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-3">Titre</th>
                <th className="text-left p-3">Matière</th>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Statut</th>
                <th className="text-right p-3">Note</th>
                <th className="text-right p-3">Rang</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((e) => {
                const r = byExam[e.id];
                return (
                  <tr key={e.id} className="border-t border-border">
                    <td className="p-3 font-medium">{e.title}</td>
                    <td className="p-3 text-muted-foreground">{e.subjects?.name ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{e.exam_date ?? "—"}</td>
                    <td className="p-3"><Badge variant={e.status === "published" ? "default" : "secondary"}>{e.status === "published" ? "Publié" : "Brouillon"}</Badge></td>
                    <td className="p-3 text-right font-semibold">
                      {e.status === "published" && r ? `${r.score}/${e.max_score}` : "—"}
                    </td>
                    <td className="p-3 text-right">{e.status === "published" && r?.position ? `#${r.position}` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        </div>
      )}
    </StudentShell>
  );
}