import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Panel, Field, Modal } from "@/components/dashboard/admin-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listTimetable, saveTimetableSlot, deleteTimetableSlot, listReferenceData } from "@/lib/admin.functions";

export const Route = createFileRoute("/dashboard/timetable")({
  head: () => ({
    meta: [
      { title: "Emploi du temps — SmartSchool RDC" },
      { name: "description", content: "Construisez l'emploi du temps : créneaux, matières, enseignants et salles par classe." },
      { property: "og:title", content: "Emploi du temps — SmartSchool RDC" },
      { property: "og:description", content: "Créneaux hebdomadaires, enseignants, matières et salles de votre école." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TimetablePage,
});

const sel = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const empty = { id: undefined as string | undefined, class_id: "", subject_id: "", teacher_id: "", day_of_week: 1, start_time: "08:00", end_time: "09:00", room: "" };

function TimetablePage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listTimetable);
  const refFn = useServerFn(listReferenceData);
  const saveFn = useServerFn(saveTimetableSlot);
  const delFn = useServerFn(deleteTimetableSlot);

  const { data: slots, isLoading } = useQuery({ queryKey: ["admin", "timetable"], queryFn: () => listFn() });
  const { data: refs } = useQuery({ queryKey: ["admin", "refs"], queryFn: () => refFn() });

  const [filterClass, setFilterClass] = useState("");
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);

  const rows = ((slots ?? []) as any[]).filter((s) => !filterClass || s.class_id === filterClass);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "timetable"] });

  const save = useMutation({
    mutationFn: () => saveFn({
      data: {
        id: form.id,
        class_id: form.class_id,
        subject_id: form.subject_id || null,
        teacher_id: form.teacher_id || null,
        day_of_week: Number(form.day_of_week),
        start_time: form.start_time,
        end_time: form.end_time,
        room: form.room || null,
      },
    }),
    onSuccess: () => { toast.success("Créneau enregistré"); setOpen(false); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Créneau supprimé"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  return (
    <DashboardShell title="Emploi du temps" subtitle="Organisation hebdomadaire des cours">
      <Panel
        title={`${rows.length} créneau(x)`}
        actions={<Button onClick={() => { setForm(empty); setOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Créer un créneau</Button>}
      >
        <div className="mb-4 max-w-xs">
          <Field label="Filtrer par classe">
            <select className={sel} value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
              <option value="">Toutes les classes</option>
              {((refs?.classes ?? []) as any[]).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>

        {isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Chargement…</p>}
        {!isLoading && rows.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Aucun créneau enregistré.</p>}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {days.map((d, i) => {
            const dayRows = rows.filter((s) => Number(s.day_of_week) === i + 1);
            if (dayRows.length === 0) return null;
            return (
              <div key={d} className="rounded-xl border border-border p-4">
                <h3 className="mb-3 text-sm font-semibold">{d}</h3>
                <ul className="space-y-2">
                  {dayRows.map((s) => (
                    <li key={s.id} className="flex items-start justify-between gap-2 rounded-lg bg-secondary/40 px-3 py-2 text-sm">
                      <div>
                        <div className="font-medium">{s.subjects?.name ?? "Cours"}</div>
                        <div className="text-xs text-muted-foreground">
                          {String(s.start_time).slice(0, 5)}–{String(s.end_time).slice(0, 5)} · {s.classes?.name ?? "—"}
                          {s.room ? ` · Salle ${s.room}` : ""}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {s.teachers ? `${s.teachers.last_name} ${s.teachers.first_name}` : "Enseignant non assigné"}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" title="Modifier" onClick={() => {
                          setForm({
                            id: s.id, class_id: s.class_id, subject_id: s.subject_id ?? "", teacher_id: s.teacher_id ?? "",
                            day_of_week: Number(s.day_of_week), start_time: String(s.start_time).slice(0, 5),
                            end_time: String(s.end_time).slice(0, 5), room: s.room ?? "",
                          });
                          setOpen(true);
                        }}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" title="Supprimer" onClick={() => { if (confirm("Supprimer ce créneau ?")) remove.mutate(s.id); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Panel>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={form.id ? "Modifier le créneau" : "Créer un créneau"}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.class_id}>Enregistrer</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Classe">
            <select className={sel} value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}>
              <option value="">—</option>
              {((refs?.classes ?? []) as any[]).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Matière">
            <select className={sel} value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })}>
              <option value="">—</option>
              {((refs?.subjects ?? []) as any[]).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Enseignant">
            <select className={sel} value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}>
              <option value="">—</option>
              {((refs?.teachers ?? []) as any[]).map((t) => <option key={t.id} value={t.id}>{t.last_name} {t.first_name}</option>)}
            </select>
          </Field>
          <Field label="Jour">
            <select className={sel} value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: Number(e.target.value) })}>
              {days.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
            </select>
          </Field>
          <Field label="Début"><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></Field>
          <Field label="Fin"><Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></Field>
          <Field label="Salle"><Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} /></Field>
        </div>
      </Modal>
    </DashboardShell>
  );
}
