import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { StudentShell, StudentStatCard } from "@/components/dashboard/StudentShell";
import { getStudentOverview, listStudentAttendance } from "@/lib/student.functions";
import { CalendarCheck, CalendarX, Clock } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/dashboard/student/attendance")({ component: AttendancePage });

function AttendancePage() {
  const { data: ov } = useQuery({ queryKey: ["student-overview"], queryFn: () => getStudentOverview() });
  const { data = [], isLoading } = useQuery({ queryKey: ["student-attendance"], queryFn: () => listStudentAttendance() });
  const s = ov?.stats;

  const byMonth: Record<string, { present: number; absent: number; late: number }> = {};
  for (const r of data as any[]) {
    const d = r.attendance_sessions?.session_date;
    if (!d) continue;
    const key = d.slice(0, 7);
    byMonth[key] = byMonth[key] || { present: 0, absent: 0, late: 0 };
    if (r.status === "present") byMonth[key].present++;
    else if (r.status === "absent") byMonth[key].absent++;
    else if (r.status === "late") byMonth[key].late++;
  }
  const chart = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({ month, ...v }));

  return (
    <StudentShell title="Présence" subtitle="Historique et statistiques">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StudentStatCard label="Taux de présence" value={`${s?.attendancePct ?? 0}%`} icon={CalendarCheck} tone="success" />
        <StudentStatCard label="Jours présents" value={s?.present ?? 0} icon={CalendarCheck} />
        <StudentStatCard label="Absences" value={s?.absent ?? 0} icon={CalendarX} tone="danger" />
        <StudentStatCard label="Retards" value={s?.late ?? 0} icon={Clock} tone="warning" />
      </div>

      {chart.length > 0 && (
        <div className="rounded-2xl border border-border bg-background/70 backdrop-blur-sm p-5 mt-6">
          <h3 className="text-sm font-semibold mb-3">Présence mensuelle</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="present" stackId="a" fill="hsl(var(--primary))" />
                <Bar dataKey="late" stackId="a" fill="#f59e0b" />
                <Bar dataKey="absent" stackId="a" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-background/70 backdrop-blur-sm overflow-hidden mt-6">
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
          <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="text-left p-3">Date</th><th className="text-left p-3">Matière</th><th className="text-left p-3">Statut</th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">Chargement…</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">Aucune donnée de présence.</td></tr>
            ) : (data as any[]).map((r, i) => (
              <tr key={i} className="border-t border-border">
                <td className="p-3">{r.attendance_sessions?.session_date}</td>
                <td className="p-3 text-muted-foreground">{r.attendance_sessions?.subjects?.name ?? "—"}</td>
                <td className="p-3">
                  <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
                    r.status === "present" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" :
                    r.status === "absent" ? "bg-red-500/15 text-red-600 dark:text-red-400" :
                    r.status === "late" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
                    "bg-secondary text-muted-foreground"
                  }`}>{r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
    </StudentShell>
  );
}