import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TeacherShell } from "@/components/dashboard/TeacherShell";
import { Button } from "@/components/ui/button";
import { getTeacherOverview, updateTeacherProfile } from "@/lib/teacher.functions";

export const Route = createFileRoute("/dashboard/teacher/profile")({
  head: () => ({ meta: [{ title: "Profil — Enseignant" }, { name: "robots", content: "noindex" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const overviewFn = useServerFn(getTeacherOverview);
  const updateFn = useServerFn(updateTeacherProfile);
  const { data } = useQuery({ queryKey: ["teacher", "overview"], queryFn: () => overviewFn() });
  const [form, setForm] = useState({ full_name: "", phone: "" });

  useEffect(() => {
    if (data?.teacher) {
      setForm({
        full_name: `${data.teacher.first_name ?? ""} ${data.teacher.last_name ?? ""}`.trim(),
        phone: data.teacher.phone ?? "",
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => updateFn({ data: { full_name: form.full_name, phone: form.phone } }),
    onSuccess: () => { toast.success("Profil mis à jour"); qc.invalidateQueries({ queryKey: ["teacher"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  return (
    <TeacherShell title="Mon profil" subtitle="Coordonnées et informations personnelles">
      <div className="max-w-2xl rounded-2xl border border-border bg-background p-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nom complet">
            <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
          </Field>
          <Field label="Téléphone">
            <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </Field>
          <Field label="Email">
            <input disabled className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm" value={data?.teacher?.email ?? ""} />
          </Field>
          <Field label="Spécialité">
            <input disabled className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm" value={data?.teacher?.specialty ?? ""} />
          </Field>
          <Field label="École">
            <input disabled className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm" value={data?.school?.name ?? ""} />
          </Field>
        </div>
        <div className="mt-6 flex justify-end">
          <Button disabled={save.isPending} onClick={() => save.mutate()}>Enregistrer</Button>
        </div>
      </div>
    </TeacherShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}