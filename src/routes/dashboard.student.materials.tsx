import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StudentShell } from "@/components/dashboard/StudentShell";
import { listStudentMaterials, listStudentBookmarks, toggleBookmark } from "@/lib/student.functions";
import { FileText, Star, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export const Route = createFileRoute("/dashboard/student/materials")({ component: MaterialsPage });

function MaterialsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({ queryKey: ["student-materials"], queryFn: () => listStudentMaterials() });
  const { data: bookmarks = [] } = useQuery({ queryKey: ["student-bookmarks"], queryFn: () => listStudentBookmarks() });
  const bmSet = new Set((bookmarks as any[]).filter((b) => b.target_type === "material").map((b) => b.target_id));

  const toggle = useMutation({
    mutationFn: (p: any) => toggleBookmark({ data: p }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["student-bookmarks"] }),
  });

  const filtered = (data as any[]).filter((m) =>
    !q || m.name?.toLowerCase().includes(q.toLowerCase()) || m.subjects?.name?.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <StudentShell title="Ressources pédagogiques" subtitle={`${filtered.length} document(s)`}>
      <Input placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm mb-4" />
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-secondary/40 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">Aucune ressource disponible pour le moment.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m: any) => {
            const marked = bmSet.has(m.id);
            return (
              <div key={m.id} className="rounded-2xl border border-border bg-background/70 backdrop-blur-sm p-5">
                <div className="flex items-start justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <button
                    onClick={() => toggle.mutate({ target_type: "material", target_id: m.id, action: marked ? "remove" : "add" })}
                    className={`grid h-8 w-8 place-items-center rounded-lg transition-colors ${marked ? "bg-amber-500/15 text-amber-600" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                    aria-label="Favori"
                  >
                    <Star className={`h-4 w-4 ${marked ? "fill-current" : ""}`} />
                  </button>
                </div>
                <h3 className="mt-3 font-semibold truncate">{m.name}</h3>
                <div className="text-xs text-muted-foreground mt-1">
                  {m.subjects?.name ?? "Général"} {m.teachers ? `· ${m.teachers.first_name} ${m.teachers.last_name}` : ""}
                </div>
                <a href={m.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  <Download className="h-3 w-3" /> Télécharger
                </a>
              </div>
            );
          })}
        </div>
      )}
    </StudentShell>
  );
}