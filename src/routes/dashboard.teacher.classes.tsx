import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { TeacherShell } from "@/components/dashboard/TeacherShell";
import { listMyClasses } from "@/lib/teacher.functions";

export const Route = createFileRoute("/dashboard/teacher/classes")({
  head: () => ({ meta: [{ title: "Mes classes — Enseignant" }, { name: "robots", content: "noindex" }] }),
  component: MyClasses,
});

function MyClasses() {
  const fn = useServerFn(listMyClasses);
  const { data, isLoading } = useQuery({ queryKey: ["teacher", "classes"], queryFn: () => fn() });
  return (
    <TeacherShell title="Mes classes" subtitle="Classes qui vous sont assignées">
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : (data ?? []).length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data as any[]).map((r, i) => (
            <div key={i} className="rounded-2xl border border-border bg-background p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">{r.classes?.level ?? "Classe"}</div>
                  <h3 className="mt-1 text-lg font-semibold">{r.classes?.name ?? "—"}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {r.subjects?.name ?? "—"} {r.subjects?.code ? `(${r.subjects.code})` : ""}
                  </p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                {r.weekly_hours ? `${r.weekly_hours} h / semaine` : "Horaire non défini"}
              </div>
            </div>
          ))}
        </div>
      )}
    </TeacherShell>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-background p-10 text-center">
      <Users className="h-8 w-8 mx-auto text-muted-foreground" />
      <p className="mt-3 text-sm text-muted-foreground">
        Aucune classe assignée pour l'instant. Votre directeur d'école doit vous ajouter à une ou plusieurs classes.
      </p>
    </div>
  );
}