import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { TeacherShell } from "@/components/dashboard/TeacherShell";
import { listTeacherNotifications, markNotificationRead } from "@/lib/teacher.functions";

export const Route = createFileRoute("/dashboard/teacher/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Enseignant" }, { name: "robots", content: "noindex" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listTeacherNotifications);
  const readFn = useServerFn(markNotificationRead);
  const { data } = useQuery({ queryKey: ["teacher", "notifications"], queryFn: () => listFn() });
  const mark = useMutation({
    mutationFn: (id: string) => readFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacher", "notifications"] }),
  });
  const rows = (data ?? []) as any[];
  return (
    <TeacherShell title="Notifications" subtitle="Vos alertes personnelles">
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-background p-10 text-center">
          <Bell className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Vous êtes à jour. Aucune nouvelle notification.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((n) => (
            <li key={n.id}
                onClick={() => !n.read && mark.mutate(n.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-colors ${n.read ? "border-border bg-background" : "border-primary/30 bg-primary/5"}`}>
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">{n.title}</div>
                <div className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("fr-FR")}</div>
              </div>
              {n.message && <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>}
            </li>
          ))}
        </ul>
      )}
    </TeacherShell>
  );
}