import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SuperAdminShell } from "@/components/super-admin/SuperAdminShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/dashboard/super-admin/audit")({
  head: () => ({ meta: [{ title: "Audit & sécurité — Super Admin" }, { name: "robots", content: "noindex" }] }),
  component: AuditPage,
});

function AuditPage() {
  const { data } = useQuery({
    queryKey: ["super-admin", "audit"],
    queryFn: async () => {
      const [audit, activity, logins] = await Promise.all([
        supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("audit_logs").select("*").in("event", ["login.success", "login.failed"]).order("created_at", { ascending: false }).limit(50),
      ]);
      return { audit: audit.data ?? [], activity: activity.data ?? [], logins: logins.data ?? [] };
    },
  });

  return (
    <SuperAdminShell title="Audit & sécurité" subtitle="Historique complet des événements sensibles">
      <Tabs defaultValue="audit">
        <TabsList>
          <TabsTrigger value="audit">Audit</TabsTrigger>
          <TabsTrigger value="logins">Connexions</TabsTrigger>
          <TabsTrigger value="activity">Activité</TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="mt-4">
          <LogTable rows={data?.audit ?? []} columns={["event", "ip_address", "user_agent", "created_at"]} />
        </TabsContent>
        <TabsContent value="logins" className="mt-4">
          <div className="rounded-2xl border border-border bg-background overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Événement</TableHead><TableHead>IP</TableHead><TableHead>Agent</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
              <TableBody>
                {(data?.logins ?? []).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Badge variant="outline" className={r.event === "login.success" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-red-500/10 text-red-600 border-red-500/30"}>{r.event}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.ip_address ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.user_agent ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("fr-FR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          <LogTable rows={data?.activity ?? []} columns={["action", "actor_name", "target_type", "created_at"]} />
        </TabsContent>
      </Tabs>
    </SuperAdminShell>
  );
}

function LogTable({ rows, columns }: { rows: any[]; columns: string[] }) {
  return (
    <div className="rounded-2xl border border-border bg-background overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>{columns.map((c) => <TableHead key={c} className="capitalize">{c.replace("_", " ")}</TableHead>)}</TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              {columns.map((c) => (
                <TableCell key={c} className={c === "created_at" ? "text-xs text-muted-foreground" : ""}>
                  {c === "created_at" ? new Date(r[c]).toLocaleString("fr-FR") : r[c] ?? "—"}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {rows.length === 0 && <TableRow><TableCell colSpan={columns.length} className="text-sm text-muted-foreground text-center py-8">Aucune entrée.</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
}