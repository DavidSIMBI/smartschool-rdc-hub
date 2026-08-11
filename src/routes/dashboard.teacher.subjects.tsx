import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import { TeacherShell } from "@/components/dashboard/TeacherShell";
import { listMySubjects } from "@/lib/teacher.functions";

export const Route = createFileRoute("/dashboard/teacher/subjects")({
  head: () => ({ meta: [{ title: "Mes matières — Enseignant" }, { name: "robots", content: "noindex" }] }),
  component: MySubjects,
});

function MySubjects() {
  const fn = useServerFn(listMySubjects);
  const { data, isLoading } = useQuery({ queryKey: ["teacher", "subjects"], queryFn: () => fn() });
  return (
    <TeacherShell title="Mes matières" subtitle="Matières que vous enseignez">
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : (data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-background p-10 text-center">
          <BookOpen className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Aucune matière assignée.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-background">
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
            <thead className="bg-secondary/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Matière</th>
                <th className="px-4 py-3 font-medium">Classe</th>
                <th className="px-4 py-3 font-medium">Heures / sem.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(data as any[]).map((r, i) => (
                <tr key={i} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{r.subjects?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.classes?.name ?? "—"}</td>
                  <td className="px-4 py-3">{r.weekly_hours ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}
    </TeacherShell>
  );
}