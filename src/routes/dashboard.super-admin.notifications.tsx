import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SuperAdminShell } from "@/components/super-admin/SuperAdminShell";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/super-admin/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Super Admin" }, { name: "robots", content: "noindex" }] }),
  component: NotifsPage,
});

function NotifsPage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["super-admin", "notifications", "all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const markAllRead = async () => {
    await supabase.from("notifications").update({ read: true }).eq("read", false);
    toast.success("Toutes marquées lues");
    qc.invalidateQueries({ queryKey: ["super-admin"] });
  };

  return (
    <SuperAdminShell
      title="Centre de notifications"
      subtitle={`${data.length} au total`}
      actions={<Button size="sm" variant="outline" onClick={markAllRead} className="gap-2"><Check className="h-4 w-4" /> Tout marquer lu</Button>}
    >
      <ul className="space-y-2">
        {data.map((n: any) => (
          <li key={n.id} className={`rounded-xl border border-border bg-background p-4 flex gap-3 ${n.read ? "opacity-70" : ""}`}>
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                n.severity === "success" ? "bg-emerald-500" : n.severity === "warning" ? "bg-amber-500" : n.severity === "critical" ? "bg-red-500" : "bg-primary"
              }`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">{n.title}</div>
                <div className="text-xs text-muted-foreground shrink-0">{new Date(n.created_at).toLocaleString("fr-FR")}</div>
              </div>
              <div className="text-sm text-muted-foreground">{n.message}</div>
            </div>
          </li>
        ))}
        {data.length === 0 && <li className="text-sm text-muted-foreground">Aucune notification.</li>}
      </ul>
    </SuperAdminShell>
  );
}