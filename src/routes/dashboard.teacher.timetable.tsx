import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { TeacherShell } from "@/components/dashboard/TeacherShell";
import { listMyTimetable, getTeacherContext } from "@/lib/teacher.functions";

export const Route = createFileRoute("/dashboard/teacher/timetable")({
  head: () => ({
    meta: [
      { title: "Mon emploi du temps — Enseignant" },
      { name: "description", content: "Horaire hebdomadaire de vos cours, tel que défini par la direction de l'école." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TimetablePage,
});

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

function TimetablePage() {
  const listFn = useServerFn(listMyTimetable);
  const ctxFn = useServerFn(getTeacherContext);
  const { data, isLoading } = useQuery({ queryKey: ["teacher", "timetable"], queryFn: () => listFn() });
  const { data: ctx } = useQuery({ queryKey: ["teacher", "context"], queryFn: () => ctxFn() });

  const rows = (data ?? []) as any[];

  return (
    <TeacherShell
      title="Mon emploi du temps"
      subtitle={
        ctx?.academic_year || ctx?.current_term
          ? `Année ${ctx?.academic_year ?? "—"} · ${ctx?.current_term ?? "—"}`
          : "Horaire défini par la direction de l'école"
      }
    >
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-background p-10 text-center">
          <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Aucun créneau ne vous est encore attribué. La direction de l'école doit vous ajouter à l'emploi du temps.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {DAYS.map((day, i) => {
            const slots = rows.filter((r) => Number(r.day_of_week) === i + 1);
            if (slots.length === 0) return null;
            return (
              <div key={day} className="rounded-2xl border border-border bg-background p-5">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{day}</div>
                <ul className="mt-3 space-y-3">
                  {slots.map((s) => (
                    <li key={s.id} className="rounded-xl bg-secondary/40 px-3 py-2">
                      <div className="text-sm font-medium">
                        {String(s.start_time).slice(0, 5)} – {String(s.end_time).slice(0, 5)}
                      </div>
                      <div className="text-sm">{s.subjects?.name ?? "Matière —"}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.classes?.name ?? "Classe —"}
                        {s.room ? ` · Salle ${s.room}` : ""}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </TeacherShell>
  );
}