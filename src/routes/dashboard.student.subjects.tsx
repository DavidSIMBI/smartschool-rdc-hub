import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import { StudentShell } from "@/components/dashboard/StudentShell";
import { listStudentSubjects } from "@/lib/student.functions";

export const Route = createFileRoute("/dashboard/student/subjects")({ component: SubjectsPage });

function SubjectsPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["student-subjects"],
    queryFn: () => listStudentSubjects(),
  });
  return (
    <StudentShell title="Mes matières" subtitle={`${data.length} matière(s)`}>
      {isLoading ? (
        <SkeletonGrid />
      ) : data.length === 0 ? (
        <EmptyState label="Aucune matière trouvée pour votre classe." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((row: any, i: number) => (
            <div key={i} className="rounded-2xl border border-border bg-background/70 backdrop-blur-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex items-start justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="h-5 w-5" />
                </div>
                {row.average !== null && (
                  <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full px-2 py-0.5">
                    Moyenne {row.average}%
                  </span>
                )}
              </div>
              <h3 className="mt-3 font-semibold">{row.subjects?.name ?? "Matière"}</h3>
              {row.subjects?.code && <div className="text-xs text-muted-foreground font-mono">{row.subjects.code}</div>}
              <div className="mt-3 text-sm text-muted-foreground">
                Enseignant: <span className="text-foreground font-medium">
                  {row.teachers ? `${row.teachers.first_name} ${row.teachers.last_name}` : "—"}
                </span>
              </div>
              {row.weekly_hours ? (
                <div className="text-xs text-muted-foreground mt-1">{row.weekly_hours}h/semaine</div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </StudentShell>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-36 rounded-2xl border border-border bg-secondary/40 animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-background/70 p-10 text-center text-muted-foreground">
      {label}
    </div>
  );
}