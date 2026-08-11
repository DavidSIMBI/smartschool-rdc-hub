import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Upload, FolderOpen, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { TeacherShell } from "@/components/dashboard/TeacherShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { listDocuments, saveDocument, deleteDocument } from "@/lib/teacher.functions";

export const Route = createFileRoute("/dashboard/teacher/documents")({
  head: () => ({ meta: [{ title: "Documents — Enseignant" }, { name: "robots", content: "noindex" }] }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listDocuments);
  const saveFn = useServerFn(saveDocument);
  const delFn = useServerFn(deleteDocument);
  const { data: rows } = useQuery({ queryKey: ["teacher", "documents"], queryFn: () => listFn() });
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("teacher-materials").upload(path, file);
      if (error) throw error;
      await saveFn({ data: { name: file.name, url: path, kind: file.type, size_bytes: file.size } });
      toast.success("Document ajouté");
      qc.invalidateQueries({ queryKey: ["teacher", "documents"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur d'envoi");
    } finally {
      setUploading(false);
    }
  };

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Supprimé"); qc.invalidateQueries({ queryKey: ["teacher", "documents"] }); },
  });

  const openDoc = async (url: string) => {
    const { data } = await supabase.storage.from("teacher-materials").createSignedUrl(url, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <TeacherShell
      title="Documents"
      subtitle="Vos supports pédagogiques (privés à votre école)"
      actions={
        <>
          <input ref={inputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
          <Button size="sm" className="gap-2" disabled={uploading} onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4" /> {uploading ? "Envoi…" : "Ajouter"}
          </Button>
        </>
      }
    >
      {((rows ?? []) as any[]).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-background p-10 text-center">
          <FolderOpen className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Aucun document. Ajoutez vos premiers supports.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-background">
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
            <thead className="bg-secondary/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Taille</th>
                <th className="px-4 py-3 font-medium">Ajouté le</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {((rows ?? []) as any[]).map((r) => (
                <tr key={r.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.kind ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.size_bytes ? `${Math.round(r.size_bytes / 1024)} Ko` : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString("fr-FR")}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => openDoc(r.url)} className="text-primary hover:underline inline-flex items-center gap-1 text-xs"><ExternalLink className="h-3 w-3" /> Ouvrir</button>
                    <button className="text-red-500 hover:text-red-600" onClick={() => del.mutate(r.id)}><Trash2 className="h-4 w-4 inline" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}
    </TeacherShell>
  );
}