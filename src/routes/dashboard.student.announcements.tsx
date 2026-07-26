import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StudentShell } from "@/components/dashboard/StudentShell";
import { listStudentAnnouncements, listStudentBookmarks, toggleBookmark } from "@/lib/student.functions";
import { Input } from "@/components/ui/input";
import { Star, Megaphone } from "lucide-react";

export const Route = createFileRoute("/dashboard/student/announcements")({ component: AnnouncementsPage });

function AnnouncementsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({ queryKey: ["student-announcements"], queryFn: () => listStudentAnnouncements() });
  const { data: bookmarks = [] } = useQuery({ queryKey: ["student-bookmarks"], queryFn: () => listStudentBookmarks() });
  const bmSet = new Set((bookmarks as any[]).filter((b) => b.target_type === "announcement").map((b) => b.target_id));
  const toggle = useMutation({
    mutationFn: (p: any) => toggleBookmark({ data: p }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["student-bookmarks"] }),
  });
  const filtered = (data as any[]).filter((a) => !q || a.title?.toLowerCase().includes(q.toLowerCase()) || a.body?.toLowerCase().includes(q.toLowerCase()));

  return (
    <StudentShell title="Annonces" subtitle={`${filtered.length} annonce(s)`}>
      <Input placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm mb-4" />
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-secondary/40 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">Aucune annonce pour le moment.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a: any) => {
            const marked = bmSet.has(a.id);
            return (
              <div key={a.id} className="rounded-2xl border border-border bg-background/70 backdrop-blur-sm p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Megaphone className="h-5 w-5" /></div>
                    <div>
                      <h3 className="font-semibold">{a.title}</h3>
                      {a.body && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.body}</p>}
                      <div className="text-xs text-muted-foreground mt-2">
                        {new Date(a.created_at).toLocaleString()} · {a.audience ?? "tous"}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggle.mutate({ target_type: "announcement", target_id: a.id, action: marked ? "remove" : "add" })}
                    className={`grid h-8 w-8 place-items-center rounded-lg ${marked ? "bg-amber-500/15 text-amber-600" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                  >
                    <Star className={`h-4 w-4 ${marked ? "fill-current" : ""}`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </StudentShell>
  );
}