import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { StudentShell } from "@/components/dashboard/StudentShell";
import { getStudentCalendar } from "@/lib/student.functions";
import { CalendarClock, BookOpen, ClipboardList, FileText, Megaphone, Flag } from "lucide-react";

export const Route = createFileRoute("/dashboard/student/calendar")({
  head: () => ({
    meta: [
      { title: "Calendrier — Espace élève" },
      { name: "description", content: "Cours du jour, examens à venir, échéances de devoirs, événements scolaires et jours fériés en RDC." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CalendarPage,
});

// Jours fériés officiels en République Démocratique du Congo
function drcHolidays(year: number) {
  return [
    { date: `${year}-01-01`, name: "Nouvel An" },
    { date: `${year}-01-04`, name: "Journée des Martyrs" },
    { date: `${year}-01-16`, name: "Journée Laurent-Désiré Kabila" },
    { date: `${year}-01-17`, name: "Journée Patrice Lumumba" },
    { date: `${year}-05-01`, name: "Fête du Travail" },
    { date: `${year}-05-17`, name: "Journée de la Libération" },
    { date: `${year}-06-30`, name: "Fête de l'Indépendance" },
    { date: `${year}-08-01`, name: "Journée des Parents" },
    { date: `${year}-12-25`, name: "Noël" },
  ];
}

type Item = {
  id: string;
  date: Date;
  title: string;
  subtitle?: string;
  kind: "class" | "exam" | "assignment" | "event" | "holiday";
};

const KIND_META: Record<Item["kind"], { label: string; icon: any; cls: string }> = {
  class: { label: "Cours", icon: BookOpen, cls: "bg-primary/10 text-primary" },
  exam: { label: "Examen", icon: FileText, cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  assignment: { label: "Devoir", icon: ClipboardList, cls: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  event: { label: "Événement", icon: Megaphone, cls: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  holiday: { label: "Férié", icon: Flag, cls: "bg-red-500/10 text-red-600 dark:text-red-400" },
};

function fmtDate(d: Date) {
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function CalendarPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["student-calendar"],
    queryFn: () => getStudentCalendar(),
  });
  const [filter, setFilter] = useState<"all" | Item["kind"]>("all");

  const items = useMemo<Item[]>(() => {
    if (!data) return [];
    const out: Item[] = [];
    const today = new Date();

    for (const c of data.classesToday as any[]) {
      const [h, m] = (c.start_time ?? "00:00").split(":").map(Number);
      const d = new Date(today);
      d.setHours(h || 0, m || 0, 0, 0);
      out.push({
        id: `c-${c.id}`,
        date: d,
        title: c.subjects?.name ?? "Cours",
        subtitle: `${c.start_time?.slice(0, 5)} – ${c.end_time?.slice(0, 5)}${c.room ? ` · Salle ${c.room}` : ""}`,
        kind: "class",
      });
    }
    for (const e of data.exams as any[]) {
      if (!e.exam_date) continue;
      out.push({
        id: `e-${e.id}`,
        date: new Date(e.exam_date),
        title: e.title,
        subtitle: [e.subjects?.name, e.term].filter(Boolean).join(" · "),
        kind: "exam",
      });
    }
    for (const a of data.assignments as any[]) {
      if (!a.due_date) continue;
      out.push({
        id: `a-${a.id}`,
        date: new Date(a.due_date),
        title: a.title,
        subtitle: `À rendre · ${a.subjects?.name ?? ""}`.trim(),
        kind: "assignment",
      });
    }
    for (const ev of data.events as any[]) {
      out.push({
        id: `ev-${ev.id}`,
        date: new Date(ev.starts_at),
        title: ev.title,
        subtitle: ev.description ?? ev.kind,
        kind: "event",
      });
    }
    const y = today.getFullYear();
    for (const h of [...drcHolidays(y), ...drcHolidays(y + 1)]) {
      const d = new Date(h.date + "T00:00:00");
      if (d < new Date(today.toDateString())) continue;
      out.push({ id: `h-${h.date}`, date: d, title: h.name, subtitle: "Jour férié — RDC", kind: "holiday" });
    }
    return out.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [data]);

  const filtered = filter === "all" ? items : items.filter((i) => i.kind === filter);

  const groups = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of filtered) {
      const key = it.date.toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const todayKey = new Date().toDateString();
  const todayItems = items.filter((i) => i.date.toDateString() === todayKey);

  return (
    <StudentShell title="Calendrier" subtitle="Cours, examens, devoirs, événements et jours fériés">
      {/* Aujourd'hui */}
      <section className="mb-6 rounded-2xl border border-border bg-background/70 backdrop-blur-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <CalendarClock className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Aujourd'hui — {fmtDate(new Date())}</h2>
        </div>
        {todayItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune activité prévue aujourd'hui.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {todayItems.map((it) => {
              const meta = KIND_META[it.kind];
              const Icon = meta.icon;
              return (
                <div key={it.id} className="rounded-xl border border-border p-3 flex gap-3">
                  <div className={`grid h-9 w-9 place-items-center rounded-lg ${meta.cls}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{it.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{it.subtitle}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(["all", "class", "exam", "assignment", "event", "holiday"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === k
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {k === "all" ? "Tout" : KIND_META[k].label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-secondary/40 animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
          Aucun événement à afficher.
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([key, list]) => {
            const d = new Date(key);
            const isToday = key === todayKey;
            return (
              <div key={key}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`text-xs uppercase tracking-widest font-semibold ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                    {fmtDate(d)} {isToday && "• Aujourd'hui"}
                  </div>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-2">
                  {list.map((it) => {
                    const meta = KIND_META[it.kind];
                    const Icon = meta.icon;
                    const showTime = it.kind === "class" || it.kind === "event";
                    return (
                      <div
                        key={it.id}
                        className="rounded-xl border border-border bg-background/70 backdrop-blur-sm p-4 flex items-start gap-3 hover:shadow-sm transition-shadow"
                      >
                        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${meta.cls}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{it.title}</span>
                            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${meta.cls}`}>
                              {meta.label}
                            </span>
                          </div>
                          {it.subtitle && <div className="text-xs text-muted-foreground mt-0.5">{it.subtitle}</div>}
                        </div>
                        {showTime && (
                          <div className="text-xs text-muted-foreground shrink-0">{fmtTime(it.date)}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </StudentShell>
  );
}