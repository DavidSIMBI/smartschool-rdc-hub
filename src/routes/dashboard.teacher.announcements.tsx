import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Megaphone, Plus } from "lucide-react";
import { toast } from "sonner";
import { TeacherShell } from "@/components/dashboard/TeacherShell";
import { Button } from "@/components/ui/button";
import { listTeacherAnnouncements, sendTeacherAnnouncement, listMyClasses } from "@/lib/teacher.functions";

export const Route = createFileRoute("/dashboard/teacher/announcements")({
  head: () => ({
    meta: [
      { title: "Annonces — Enseignant" },
      { name: "description", content: "Publiez des annonces à vos classes et consultez celles de l'école." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listTeacherAnnouncements);
  const classesFn = useServerFn(listMyClasses);
  const sendFn = useServerFn(sendTeacherAnnouncement);

  const { data: rows } = useQuery({ queryKey: ["teacher", "announcements"], queryFn: () => listFn() });
  const { data: classes } = useQuery({ queryKey: ["teacher", "classes"], queryFn: () => classesFn() });

  const distinctClasses = useMemo(() => {
    const seen = new Set<string>();
    return ((classes ?? []) as any[]).filter((r) => (seen.has(r.class_id) ? false : (seen.add(r.class_id), true)));
  }, [classes]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", class_id: "" });

  const send = useMutation({
    mutationFn: () => sendFn({ data: { title: form.title, body: form.body || null, class_id: form.class_id || null } }),
    onSuccess: () => {
      toast.success("Annonce publiée");
      qc.invalidateQueries({ queryKey: ["teacher", "announcements"] });
      setOpen(false);
      setForm({ title: "", body: "", class_id: "" });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  return (
    <TeacherShell
      title="Annonces"
      subtitle="Publiez une annonce à vos classes et suivez celles de l'école"
      actions={<Button size="sm" className="gap-2" onClick={() => setOpen((v) => !v)}><Plus className="h-4 w-4" /> Nouvelle</Button>}
    >
      {open && (
        <div className="rounded-2xl border border-border bg-background p-6 mb-6 animate-in slide-in-from-top-2">
          <div className="grid gap-3">
            <select
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.class_id}
              onChange={(e) => setForm((f) => ({ ...f, class_id: e.target.value }))}
            >
              <option value="">Toute l'école</option>
              {distinctClasses.map((r) => (
                <option key={r.class_id} value={r.class_id}>{r.classes?.name}</option>
              ))}
            </select>
            <input
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Titre"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <textarea
              className="rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
              placeholder="Message"
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
            <Button disabled={!form.title || send.isPending} onClick={() => send.mutate()}>Publier</Button>
          </div>
        </div>
      )}

      {((rows ?? []) as any[]).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-background p-10 text-center">
          <Megaphone className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Aucune annonce pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {((rows ?? []) as any[]).map((a) => (
            <div key={a.id} className="rounded-2xl border border-border bg-background p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold">{a.title}</h3>
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary shrink-0">{a.audience ?? "école"}</span>
              </div>
              {a.body && <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{a.body}</p>}
              <div className="mt-3 text-xs text-muted-foreground">
                {new Date(a.publish_at ?? a.created_at).toLocaleString("fr-FR")}
              </div>
            </div>
          ))}
        </div>
      )}
    </TeacherShell>
  );
}