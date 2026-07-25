import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SuperAdminShell } from "@/components/super-admin/SuperAdminShell";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/dashboard/super-admin/subscriptions")({
  head: () => ({ meta: [{ title: "Abonnements — Super Admin" }, { name: "robots", content: "noindex" }] }),
  component: SubsPage,
});

function SubsPage() {
  const { data = [] } = useQuery({
    queryKey: ["super-admin", "subscriptions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*, schools(name, province, city)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  return (
    <SuperAdminShell title="Abonnements" subtitle="Suivi des plans par école">
      <div className="rounded-2xl border border-border bg-background overflow-hidden shadow-[var(--shadow-soft)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>École</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Prix / mois</TableHead>
              <TableHead>Période</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.schools?.name}</TableCell>
                <TableCell><Badge variant="secondary" className="capitalize">{s.plan}</Badge></TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{s.status}</Badge></TableCell>
                <TableCell className="text-right">{Number(s.monthly_price).toFixed(2)} {s.currency}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(s.current_period_start).toLocaleDateString("fr-FR")} → {new Date(s.current_period_end).toLocaleDateString("fr-FR")}
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-sm text-muted-foreground">Aucun abonnement.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </SuperAdminShell>
  );
}