import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { StudentShell } from "@/components/dashboard/StudentShell";
import { getStudentOverview, listStudentAssignments, listStudentAnnouncements } from "@/lib/student.functions";
import { ClipboardList, Megaphone, FileText } from "lucide-react";

export const Route = createFileRoute("/dashboard/student/notifications")({ component: NotificationsPage });

function NotificationsPage() {
  const { data: ov } = useQuery({ queryKey: ["student-overview"], queryFn: () => getStudentOverview() });
  const { data: assignments = [] } = useQuery({ queryKey: ["student-assignments"], queryFn: () => listStudentAssignments() });
  const { data: announcements = [] } = useQuery({ queryKey: ["student-announcements"], queryFn: () => listStudentAnnouncements() });

  const recentAss = (assignments as any[]).slice(0, 5).map((a) => ({
    icon: ClipboardList, kind: "Devoir", title: a.title, at: a.created_at ?? a.due_date,
    body: a.subjects?.name,
  }));
  const graded = (assignments as any[]).filter((a) => a.submission?.grade !== null && a.submission?.grade !== undefined).slice(0, 5).map((a) => ({
    icon: FileText, kind: "Note reçue", title: `${a.title}: ${a.submission.grade}`, at: a.submission.submitted_at, body: a.submission.feedback,
  }));
  const anns = (announcements as any[]).slice(0, 5).map((a) => ({
    icon: Megaphone, kind: "Annonce", title: a.title, at: a.created_at, body: a.body,
  }));

  const feed = [...recentAss, ...graded, ...anns]
    .filter((n) => n.at)
    .sort((a, b) => new Date(b.at as any).getTime() - new Date(a.at as any).getTime());

  return (
    <StudentShell title="Notifications" subtitle={`${ov?.stats?.unreadMessages ?? 0} message(s) non lu(s)`}>
      {feed.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">Aucune notification.</div>
      ) : (
        <div className="space-y-2">
          {feed.map((n, i) => (
            <div key={i} className="rounded-xl border border-border bg-background/70 backdrop-blur-sm p-4 flex gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <n.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-2">
                  <div className="font-medium">{n.kind} · {n.title}</div>
                  <div className="text-xs text-muted-foreground shrink-0">{new Date(n.at as any).toLocaleDateString()}</div>
                </div>
                {n.body && <div className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.body}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </StudentShell>
  );
}