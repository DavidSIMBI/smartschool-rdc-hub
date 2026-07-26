import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StudentShell } from "@/components/dashboard/StudentShell";
import { getStudentOverview, updateStudentPhoto } from "@/lib/student.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera } from "lucide-react";

export const Route = createFileRoute("/dashboard/student/profile")({ component: ProfilePage });

function ProfilePage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["student-overview"], queryFn: () => getStudentOverview() });
  const st = data?.student;
  const [uploading, setUploading] = useState(false);

  const savePhoto = useMutation({
    mutationFn: (url: string | null) => updateStudentPhoto({ data: { photo_url: url } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["student-overview"] }); toast.success("Photo mise à jour"); },
  });

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !st) return;
    setUploading(true);
    try {
      const path = `students/${st.id}/${Date.now()}-${f.name}`;
      const { error } = await supabase.storage.from("teacher-materials").upload(path, f, { upsert: true });
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("teacher-materials").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signed?.signedUrl) await savePhoto.mutateAsync(signed.signedUrl);
    } catch (err: any) {
      toast.error(err.message ?? "Échec");
    } finally {
      setUploading(false);
    }
  }

  const rows: [string, string | null | undefined][] = [
    ["Prénom", st?.first_name],
    ["Nom", st?.last_name],
    ["Matricule", st?.matricule],
    ["Genre", st?.gender],
    ["Date de naissance", st?.date_of_birth],
    ["Email", st?.email],
    ["Téléphone", st?.phone],
    ["Adresse", st?.address],
    ["Contact d'urgence", st?.emergency_contact ?? st?.guardian_phone],
    ["Tuteur", st?.guardian_name],
    ["Informations médicales", st?.medical_info],
  ];

  return (
    <StudentShell title="Mon profil" subtitle="Informations personnelles (lecture seule)">
      <div className="grid md:grid-cols-[280px_1fr] gap-6">
        <div className="rounded-2xl border border-border bg-background/70 backdrop-blur-sm p-5 text-center">
          {st?.photo_url ? (
            <img src={st.photo_url} alt="" className="h-32 w-32 mx-auto rounded-2xl object-cover border-2 border-primary/30" />
          ) : (
            <div className="h-32 w-32 mx-auto rounded-2xl grid place-items-center bg-primary/10 text-primary text-4xl font-bold">
              {(st?.first_name?.[0] ?? "") + (st?.last_name?.[0] ?? "")}
            </div>
          )}
          <div className="mt-3 font-semibold">{st?.first_name} {st?.last_name}</div>
          <div className="text-xs text-muted-foreground font-mono">{st?.matricule}</div>
          <label className="mt-4 inline-flex items-center gap-2 text-sm text-primary cursor-pointer hover:underline">
            <Camera className="h-4 w-4" /> {uploading ? "Envoi…" : "Changer la photo"}
            <input type="file" accept="image/*" hidden onChange={onFile} disabled={uploading} />
          </label>
        </div>
        <div className="rounded-2xl border border-border bg-background/70 backdrop-blur-sm divide-y divide-border">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[180px_1fr] gap-4 px-5 py-3 text-sm">
              <div className="text-muted-foreground">{k}</div>
              <div className="font-medium">{v || <span className="text-muted-foreground">—</span>}</div>
            </div>
          ))}
          <div className="px-5 py-3 text-xs text-muted-foreground">
            Les informations ci-dessus sont gérées par votre école. Contactez le secrétariat pour toute correction.
          </div>
        </div>
      </div>
    </StudentShell>
  );
}