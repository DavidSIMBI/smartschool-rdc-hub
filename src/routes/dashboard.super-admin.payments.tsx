import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SuperAdminShell, StatCard } from "@/components/super-admin/SuperAdminShell";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, CheckCircle2, Clock, XCircle } from "lucide-react";

export const Route = createFileRoute("/dashboard/super-admin/payments")({
  head: () => ({ meta: [{ title: "Paiements — Super Admin" }, { name: "robots", content: "noindex" }] }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const { data = [] } = useQuery({
    queryKey: ["super-admin", "payments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("*, schools(name)")
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  const paid = data.filter((p: any) => p.status === "paid");
  const pending = data.filter((p: any) => p.status === "pending");
  const failed = data.filter((p: any) => p.status === "failed");
  const revenue = paid.reduce((s: number, p: any) => s + Number(p.amount), 0);

  return (
    <SuperAdminShell title="Paiements" subtitle="Transactions récentes">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <StatCard label="Revenu total" value={`$${revenue.toFixed(0)}`} icon={DollarSign} tone="success" />
        <StatCard label="Réussis" value={paid.length} icon={CheckCircle2} tone="success" />
        <StatCard label="En attente" value={pending.length} icon={Clock} tone="warning" />
        <StatCard label="Échecs" value={failed.length} icon={XCircle} tone="danger" />
      </div>

      <div className="rounded-2xl border border-border bg-background overflow-hidden shadow-[var(--shadow-soft)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>École</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Méthode</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.schools?.name}</TableCell>
                <TableCell>{Number(p.amount).toFixed(2)} {p.currency}</TableCell>
                <TableCell className="capitalize">{p.method ?? "—"}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      p.status === "paid"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                        : p.status === "pending"
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                        : "bg-red-500/10 text-red-600 border-red-500/30"
                    }
                  >{p.status}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(p.paid_at ?? p.created_at).toLocaleString("fr-FR")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SuperAdminShell>
  );
}