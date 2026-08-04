import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FileText, Download, PlayCircle, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { StudentShell } from "@/components/dashboard/StudentShell";
import { Input } from "@/components/ui/input";
import { listStudentResources } from "@/lib/student.functions";
import { signedUrl } from "@/lib/storage-upload";
import { RESOURCE_TYPES, formatBytes } from "@/lib/lms";

export const Route = createFileRoute("/dashboard/student/resources")({
  head: () => ({
    meta: [
      { title: "Ressources d'apprentissage — Élève" },
      { name: "description", content: "Consultez et téléchargez les notes de cours, présentations et vidéos publiées par vos enseignants." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentResourcesPage,
});

function StudentResourcesPage() {
  const { data = [], isLoading } = useQuery({ queryKey: ["student-resources"], queryFn: () => listStudentResources() });
  const [q, setQ] = useState("");

  const filtered = (data as any[]).filter((r) =>
    !q ||
    r.title?.toLowerCase().includes(q.toLowerCase()) ||
    r.topic?.toLowerCase().includes(q.toLowerCase()) ||
    r.subjects?.name?.toLowerCase().includes(q.toLowerCase()),
  );

  const open = async (r: any) => {
    try {
      if (r.storage_path) window.open(await signedUrl("teacher-materials", r.storage_path, 3600), "_blank");
      else if (r.external_url) window.open(r.external_url, "_blank");
    } catch (e: any) {
      toast.error(e?.message ?? "Impossible d'ouvrir la ressource");
    }
  };

  const Icon = (t: string) => (t === "image" ? ImageIcon : t === "video" || t === "video_link" ? PlayCircle : FileText);

  return (
    <StudentShell title="Ressources d'apprentissage" subtitle={`${filtered.length} ressource(s) disponible(s)`}>
      <Input placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm mb-4" />
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 rounded-2xl bg-secondary/40 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">Aucune ressource publiée pour le moment.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r: any) => {
            const I = Icon(r.resource_type);
            return (
              <div key={r.id} className="rounded-2xl border border-border bg-background/70 backdrop-blur-sm p-5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <I className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-semibold">{r.title}</h3>
                {r.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{r.description}</p>}
                <div className="text-xs text-muted-foreground mt-2">
                  {RESOURCE_TYPES.find((t) => t.value === r.resource_type)?.label ?? r.resource_type}
                  {r.subjects?.name ? ` · ${r.subjects.name}` : ""}
                  {r.topic ? ` · ${r.topic}` : ""}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {[r.academic_year, r.term].filter(Boolean).join(" · ")}
                  {r.teachers ? ` · ${r.teachers.first_name} ${r.teachers.last_name}` : ""}
                  {r.size_bytes ? ` · ${formatBytes(r.size_bytes)}` : ""}
                </div>
                {r.due_date && <div className="text-xs text-amber-600 mt-1">À consulter avant le {new Date(r.due_date).toLocaleDateString("fr-FR")}</div>}
                <button onClick={() => open(r)} className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  <Download className="h-3 w-3" /> {r.storage_path ? "Télécharger" : "Ouvrir le lien"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </StudentShell>
  );
}