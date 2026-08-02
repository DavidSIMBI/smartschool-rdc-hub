import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Trash2, Pencil, Receipt, Printer } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell, StatCard } from "@/components/dashboard/DashboardShell";
import { Panel, Field, Modal, StatusBadge } from "@/components/dashboard/admin-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Wallet, Clock, Receipt as ReceiptIcon } from "lucide-react";
import { listFees, saveFeeStructure, deleteFeeStructure, recordPayment, deletePayment, listReferenceData } from "@/lib/admin.functions";

export const Route = createFileRoute("/dashboard/fees")({
  head: () => ({
    meta: [
      { title: "Frais scolaires — SmartSchool RDC" },
      { name: "description", content: "Structures de frais, paiements, encaissements en attente et reçus imprimables pour votre école." },
      { property: "og:title", content: "Frais scolaires — SmartSchool RDC" },
      { property: "og:description", content: "Gérez les frais, enregistrez les paiements et imprimez les reçus." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FeesPage,
});

const sel = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
const emptyStruct = { id: undefined as string | undefined, name: "", description: "", class_id: "", amount: 0, currency: "CDF", term: "", academic_year: "", due_date: "" };
const emptyPay = { student_id: "", fee_structure_id: "", amount: 0, currency: "CDF", method: "cash", reference: "", status: "paid" as "paid" | "pending", note: "" };

function FeesPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listFees);
  const refFn = useServerFn(listReferenceData);
  const saveStructFn = useServerFn(saveFeeStructure);
  const delStructFn = useServerFn(deleteFeeStructure);
  const payFn = useServerFn(recordPayment);
  const delPayFn = useServerFn(deletePayment);

  const { data, isLoading } = useQuery({ queryKey: ["admin", "fees"], queryFn: () => listFn() });
  const { data: refs } = useQuery({ queryKey: ["admin", "refs"], queryFn: () => refFn() });

  const [struct, setStruct] = useState(emptyStruct);
  const [structOpen, setStructOpen] = useState(false);
  const [pay, setPay] = useState(emptyPay);
  const [payOpen, setPayOpen] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);

  const totals = useMemo(() => {
    const payments = (data?.payments ?? []) as any[];
    const paid = payments.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount ?? 0), 0);
    const pending = payments.filter((p) => p.status !== "paid").reduce((s, p) => s + Number(p.amount ?? 0), 0);
    return { paid, pending, count: payments.length };
  }, [data]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "fees"] });

  const saveStruct = useMutation({
    mutationFn: () => saveStructFn({
      data: {
        id: struct.id,
        name: struct.name,
        description: struct.description || null,
        class_id: struct.class_id || null,
        amount: Number(struct.amount),
        currency: struct.currency || "CDF",
        term: struct.term || null,
        academic_year: struct.academic_year || null,
        due_date: struct.due_date || null,
      },
    }),
    onSuccess: () => { toast.success("Structure de frais enregistrée"); setStructOpen(false); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const removeStruct = useMutation({
    mutationFn: (id: string) => delStructFn({ data: { id } }),
    onSuccess: () => { toast.success("Supprimé"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const record = useMutation({
    mutationFn: () => payFn({
      data: {
        student_id: pay.student_id,
        fee_structure_id: pay.fee_structure_id || null,
        amount: Number(pay.amount),
        currency: pay.currency || "CDF",
        method: pay.method || null,
        reference: pay.reference || null,
        status: pay.status,
        note: pay.note || null,
      },
    }),
    onSuccess: (res: any) => {
      toast.success(`Paiement enregistré · Reçu ${res?.receipt_no ?? ""}`);
      setPayOpen(false);
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const removePay = useMutation({
    mutationFn: (id: string) => delPayFn({ data: { id } }),
    onSuccess: () => { toast.success("Paiement supprimé"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  return (
    <DashboardShell title="Frais scolaires" subtitle="Structures, paiements et reçus">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Encaissé" value={`${totals.paid.toLocaleString("fr-FR")} CDF`} icon={Wallet} />
        <StatCard label="En attente" value={`${totals.pending.toLocaleString("fr-FR")} CDF`} icon={Clock} />
        <StatCard label="Paiements" value={totals.count} icon={ReceiptIcon} />
      </div>

      <div className="mt-6">
        <Panel
          title="Structures de frais"
          actions={<Button onClick={() => { setStruct(emptyStruct); setStructOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Ajouter une structure</Button>}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3">Nom</th><th className="py-2 pr-3">Classe</th>
                  <th className="py-2 pr-3">Montant</th><th className="py-2 pr-3">Période</th>
                  <th className="py-2 pr-3">Échéance</th><th className="py-2 pr-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Chargement…</td></tr>}
                {!isLoading && (data?.structures ?? []).length === 0 && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Aucune structure de frais.</td></tr>}
                {((data?.structures ?? []) as any[]).map((f) => (
                  <tr key={f.id} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-medium">{f.name}</td>
                    <td className="py-2 pr-3">{f.classes?.name ?? "Toutes"}</td>
                    <td className="py-2 pr-3">{Number(f.amount).toLocaleString("fr-FR")} {f.currency}</td>
                    <td className="py-2 pr-3">{f.term ?? "—"}</td>
                    <td className="py-2 pr-3">{f.due_date ?? "—"}</td>
                    <td className="py-2 pr-3">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" title="Modifier" onClick={() => {
                          setStruct({
                            id: f.id, name: f.name, description: f.description ?? "", class_id: f.class_id ?? "",
                            amount: Number(f.amount), currency: f.currency ?? "CDF", term: f.term ?? "",
                            academic_year: f.academic_year ?? "", due_date: f.due_date ?? "",
                          });
                          setStructOpen(true);
                        }}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" title="Supprimer" onClick={() => { if (confirm("Supprimer cette structure ?")) removeStruct.mutate(f.id); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel
          title="Paiements"
          actions={<Button onClick={() => { setPay(emptyPay); setPayOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Enregistrer un paiement</Button>}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3">Reçu</th><th className="py-2 pr-3">Élève</th>
                  <th className="py-2 pr-3">Frais</th><th className="py-2 pr-3">Montant</th>
                  <th className="py-2 pr-3">Méthode</th><th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Statut</th><th className="py-2 pr-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data?.payments ?? []).length === 0 && <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">Aucun paiement.</td></tr>}
                {((data?.payments ?? []) as any[]).map((p) => (
                  <tr key={p.id} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-mono text-xs">{p.receipt_no ?? "—"}</td>
                    <td className="py-2 pr-3 font-medium">{p.students ? `${p.students.last_name} ${p.students.first_name}` : "—"}</td>
                    <td className="py-2 pr-3">{p.fee_structures?.name ?? "—"}</td>
                    <td className="py-2 pr-3">{Number(p.amount).toLocaleString("fr-FR")} {p.currency}</td>
                    <td className="py-2 pr-3">{p.method ?? "—"}</td>
                    <td className="py-2 pr-3">{p.paid_at ? new Date(p.paid_at).toLocaleDateString("fr-FR") : "—"}</td>
                    <td className="py-2 pr-3"><StatusBadge value={p.status} /></td>
                    <td className="py-2 pr-3">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" title="Reçu" onClick={() => setReceipt(p)}><Receipt className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" title="Supprimer" onClick={() => { if (confirm("Supprimer ce paiement ?")) removePay.mutate(p.id); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Modal
        open={structOpen}
        onOpenChange={setStructOpen}
        title={struct.id ? "Modifier la structure" : "Ajouter une structure de frais"}
        footer={
          <>
            <Button variant="outline" onClick={() => setStructOpen(false)}>Annuler</Button>
            <Button onClick={() => saveStruct.mutate()} disabled={saveStruct.isPending || !struct.name}>Enregistrer</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom"><Input value={struct.name} onChange={(e) => setStruct({ ...struct, name: e.target.value })} /></Field>
          <Field label="Classe (optionnel)">
            <select className={sel} value={struct.class_id} onChange={(e) => setStruct({ ...struct, class_id: e.target.value })}>
              <option value="">Toutes les classes</option>
              {((refs?.classes ?? []) as any[]).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Montant"><Input type="number" value={struct.amount} onChange={(e) => setStruct({ ...struct, amount: Number(e.target.value) })} /></Field>
          <Field label="Devise">
            <select className={sel} value={struct.currency} onChange={(e) => setStruct({ ...struct, currency: e.target.value })}>
              <option value="CDF">CDF</option><option value="USD">USD</option>
            </select>
          </Field>
          <Field label="Période"><Input value={struct.term} onChange={(e) => setStruct({ ...struct, term: e.target.value })} /></Field>
          <Field label="Année académique"><Input value={struct.academic_year} onChange={(e) => setStruct({ ...struct, academic_year: e.target.value })} /></Field>
          <Field label="Échéance"><Input type="date" value={struct.due_date} onChange={(e) => setStruct({ ...struct, due_date: e.target.value })} /></Field>
        </div>
        <Field label="Description"><Textarea rows={2} value={struct.description} onChange={(e) => setStruct({ ...struct, description: e.target.value })} /></Field>
      </Modal>

      <Modal
        open={payOpen}
        onOpenChange={setPayOpen}
        title="Enregistrer un paiement"
        footer={
          <>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Annuler</Button>
            <Button onClick={() => record.mutate()} disabled={record.isPending || !pay.student_id || !pay.amount}>Enregistrer</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Élève">
            <select className={sel} value={pay.student_id} onChange={(e) => setPay({ ...pay, student_id: e.target.value })}>
              <option value="">Sélectionner…</option>
              {((data?.students ?? []) as any[]).map((s) => <option key={s.id} value={s.id}>{s.last_name} {s.first_name} {s.matricule ? `(${s.matricule})` : ""}</option>)}
            </select>
          </Field>
          <Field label="Frais">
            <select
              className={sel}
              value={pay.fee_structure_id}
              onChange={(e) => {
                const f = ((data?.structures ?? []) as any[]).find((x) => x.id === e.target.value);
                setPay({ ...pay, fee_structure_id: e.target.value, amount: f ? Number(f.amount) : pay.amount, currency: f?.currency ?? pay.currency });
              }}
            >
              <option value="">—</option>
              {((data?.structures ?? []) as any[]).map((f) => <option key={f.id} value={f.id}>{f.name} · {Number(f.amount).toLocaleString("fr-FR")} {f.currency}</option>)}
            </select>
          </Field>
          <Field label="Montant"><Input type="number" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: Number(e.target.value) })} /></Field>
          <Field label="Devise">
            <select className={sel} value={pay.currency} onChange={(e) => setPay({ ...pay, currency: e.target.value })}>
              <option value="CDF">CDF</option><option value="USD">USD</option>
            </select>
          </Field>
          <Field label="Méthode">
            <select className={sel} value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>
              <option value="cash">Espèces</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="bank">Banque</option>
            </select>
          </Field>
          <Field label="Statut">
            <select className={sel} value={pay.status} onChange={(e) => setPay({ ...pay, status: e.target.value as "paid" | "pending" })}>
              <option value="paid">Payé</option><option value="pending">En attente</option>
            </select>
          </Field>
          <Field label="Référence"><Input value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} /></Field>
        </div>
        <Field label="Note"><Textarea rows={2} value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} /></Field>
      </Modal>

      <Modal
        open={Boolean(receipt)}
        onOpenChange={() => setReceipt(null)}
        title="Reçu de paiement"
        footer={<Button className="gap-2" onClick={() => window.print()}><Printer className="h-4 w-4" /> Imprimer / PDF</Button>}
      >
        {receipt && (
          <div className="space-y-2 rounded-xl border border-border p-5 text-sm">
            <p className="font-mono text-xs text-muted-foreground">Reçu n° {receipt.receipt_no ?? "—"}</p>
            <p className="text-lg font-semibold">{Number(receipt.amount).toLocaleString("fr-FR")} {receipt.currency}</p>
            <p>Élève : <strong>{receipt.students ? `${receipt.students.last_name} ${receipt.students.first_name}` : "—"}</strong></p>
            <p className="text-muted-foreground">Frais : {receipt.fee_structures?.name ?? "—"}</p>
            <p className="text-muted-foreground">Méthode : {receipt.method ?? "—"} · Référence : {receipt.reference ?? "—"}</p>
            <p className="text-muted-foreground">Date : {receipt.paid_at ? new Date(receipt.paid_at).toLocaleString("fr-FR") : "—"}</p>
            <p className="text-muted-foreground">Statut : {receipt.status}</p>
            {receipt.note && <p className="text-muted-foreground">Note : {receipt.note}</p>}
          </div>
        )}
      </Modal>
    </DashboardShell>
  );
}
