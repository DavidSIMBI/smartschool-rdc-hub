import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { StudentShell } from "@/components/dashboard/StudentShell";
import { getStudentReportCard } from "@/lib/student.functions";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";

export const Route = createFileRoute("/dashboard/student/report-card")({ component: ReportCardPage });

function ReportCardPage() {
  const { data, isLoading } = useQuery({ queryKey: ["student-report-card"], queryFn: () => getStudentReportCard() });
  const st = data?.student;
  const rows: any[] = data?.rows ?? [];

  const bySubject: Record<string, { name: string; scores: number[] }> = {};
  for (const r of rows) {
    const name = r.exams?.subjects?.name ?? "—";
    const pct = r.exams?.max_score ? (Number(r.score) / Number(r.exams.max_score)) * 100 : 0;
    bySubject[name] = bySubject[name] || { name, scores: [] };
    bySubject[name].scores.push(pct);
  }
  const summary = Object.values(bySubject).map((s) => ({
    name: s.name,
    average: s.scores.length ? Math.round((s.scores.reduce((a, b) => a + b, 0) / s.scores.length) * 10) / 10 : 0,
    count: s.scores.length,
  }));
  const overall = summary.length ? Math.round((summary.reduce((a, s) => a + s.average, 0) / summary.length) * 10) / 10 : 0;

  return (
    <StudentShell title="Bulletin scolaire" subtitle="Consolidation des évaluations publiées"
      actions={
        <div className="flex gap-2 print:hidden">
          <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Imprimer</Button>
          <Button size="sm" onClick={() => window.print()}><Download className="h-4 w-4 mr-1" />PDF</Button>
        </div>
      }
    >
      <div className="rounded-3xl border border-border bg-background p-8 print:border-none print:shadow-none">
        <div className="flex items-center justify-between border-b pb-4 mb-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-primary font-semibold">Bulletin officiel</div>
            <h2 className="text-2xl font-bold">{st?.first_name} {st?.last_name}</h2>
            <div className="text-sm text-muted-foreground">Matricule: <span className="font-mono">{st?.matricule ?? "—"}</span></div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Moyenne générale</div>
            <div className="text-3xl font-bold text-primary">{isLoading ? "…" : `${overall}%`}</div>
          </div>
        </div>

        {summary.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">Aucun résultat publié pour l'instant.</div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                <th className="text-left py-2">Matière</th>
                <th className="text-right py-2">Nb évaluations</th>
                <th className="text-right py-2">Moyenne</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((s) => (
                <tr key={s.name} className="border-t border-border">
                  <td className="py-2 font-medium">{s.name}</td>
                  <td className="py-2 text-right text-muted-foreground">{s.count}</td>
                  <td className="py-2 text-right font-semibold">{s.average}%</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}

        <div className="mt-8 grid sm:grid-cols-2 gap-4 text-sm">
          <div className="rounded-xl border border-dashed p-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Appréciation professeur</div>
            <div className="mt-1 italic text-muted-foreground">À compléter par l'enseignant.</div>
          </div>
          <div className="rounded-xl border border-dashed p-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Appréciation direction</div>
            <div className="mt-1 italic text-muted-foreground">À compléter par la direction.</div>
          </div>
        </div>
      </div>
    </StudentShell>
  );
}