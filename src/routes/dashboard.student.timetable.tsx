import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { StudentShell } from "@/components/dashboard/StudentShell";
import { listStudentTimetable } from "@/lib/student.functions";

export const Route = createFileRoute("/dashboard/student/timetable")({ component: TimetablePage });

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

function TimetablePage() {
  const { data = [], isLoading } = useQuery({ queryKey: ["student-timetable"], queryFn: () => listStudentTimetable() });
  const byDay: Record<number, any[]> = {};
  for (const s of data as any[]) {
    byDay[s.day_of_week] = byDay[s.day_of_week] || [];
    byDay[s.day_of_week].push(s);
  }

  return (
    <StudentShell title="Emploi du temps" subtitle="Semaine">
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-40 rounded-2xl bg-secondary/40 animate-pulse" />)}
        </div>
      ) : (data as any[]).length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
          Aucun emploi du temps configuré. Contactez le secrétariat de votre école.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DAYS.map((day, i) => {
            const slots = (byDay[i + 1] ?? []).sort((a, b) => a.start_time.localeCompare(b.start_time));
            if (!slots.length) return null;
            return (
              <div key={day} className="rounded-2xl border border-border bg-background/70 backdrop-blur-sm p-4">
                <div className="text-xs uppercase tracking-widest text-primary font-semibold mb-3">{day}</div>
                <div className="space-y-2">
                  {slots.map((s: any) => (
                    <div key={s.id} className="rounded-lg border border-border p-3">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}</span>
                        {s.room && <span>Salle {s.room}</span>}
                      </div>
                      <div className="mt-1 font-medium text-sm">{s.subjects?.name ?? "—"}</div>
                      {s.teachers && <div className="text-xs text-muted-foreground">{s.teachers.first_name} {s.teachers.last_name}</div>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </StudentShell>
  );
}