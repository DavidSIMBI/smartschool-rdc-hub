import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { TeacherShell } from "@/components/dashboard/TeacherShell";
import { Button } from "@/components/ui/button";
import { listCalendar, createCalendarEvent } from "@/lib/teacher.functions";

export const Route = createFileRoute("/dashboard/teacher/calendar")({
  head: () => ({ meta: [{ title: "Calendrier — Enseignant" }, { name: "robots", content: "noindex" }] }),
  component: CalendarPage,
});

function CalendarPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCalendar);
  const createFn = useServerFn(createCalendarEvent);
  const { data } = useQuery({ queryKey: ["teacher", "calendar"], queryFn: () => listFn() });
  const [form, setForm] = useState({ title: "", starts_at: "", ends_at: "", kind: "event", description: "" });

  const create = useMutation({
    mutationFn: () => createFn({ data: { title: form.title, starts_at: new Date(form.starts_at).toISOString(), ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null, kind: form.kind, description: form.description || null } }),
    onSuccess: () => { toast.success("Événement créé"); qc.invalidateQueries({ queryKey: ["teacher", "calendar"] }); setForm({ title: "", starts_at: "", ends_at: "", kind: "event", description: "" }); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const upcoming = ((data ?? []) as any[]).filter((e) => new Date(e.starts_at) >= new Date()).slice(0, 30);

  return (
    <TeacherShell title="Calendrier" subtitle="Événements et échéances de votre école">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-background p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4">À venir</h2>
          {upcoming.length === 0 ? (
            <div className="text-sm text-muted-foreground p-6 text-center"><CalendarDays className="h-6 w-6 mx-auto opacity-50 mb-2" />Aucun événement à venir.</div>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((e: any) => (
                <li key={e.id} className="p-4 rounded-lg border border-border flex items-start gap-4">
                  <div className="grid place-items-center h-12 w-12 rounded-lg bg-primary/10 text-primary font-semibold text-sm">
                    {new Date(e.starts_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{e.title}</div>
                    <div className="text-xs text-muted-foreground">{new Date(e.starts_at).toLocaleString("fr-FR")} {e.kind && `· ${e.kind}`}</div>
                    {e.description && <p className="mt-1 text-sm text-muted-foreground">{e.description}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-background p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2"><Plus className="h-4 w-4" /> Nouvel événement</h2>
          <div className="space-y-3">
            <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Titre" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <input type="datetime-local" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.starts_at} onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))} />
            <input type="datetime-local" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.ends_at} onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))} />
            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}>
              <option value="event">Événement</option>
              <option value="exam">Examen</option>
              <option value="meeting">Réunion</option>
              <option value="holiday">Congé</option>
            </select>
            <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]" placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <Button className="w-full" disabled={!form.title || !form.starts_at || create.isPending} onClick={() => create.mutate()}>Créer</Button>
          </div>
        </div>
      </div>
    </TeacherShell>
  );
}