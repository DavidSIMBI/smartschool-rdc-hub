import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Plus,
  BadgeCheck,
  Ban,
  Play,
  Trash2,
  KeyRound,
  Eye,
  ExternalLink,
  Pencil,
  Building2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SuperAdminShell } from "@/components/super-admin/SuperAdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createSchool,
  deleteSchool,
  resetSchoolAdminPassword,
  updateSchoolStatus,
} from "@/lib/super-admin.functions";

export const Route = createFileRoute("/dashboard/super-admin/schools")({
  head: () => ({ meta: [{ title: "Écoles — Super Admin — SmartSchool RDC" }, { name: "robots", content: "noindex" }] }),
  component: SchoolsPage,
});

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "Active", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
    pending: { label: "En attente", cls: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
    suspended: { label: "Suspendue", cls: "bg-red-500/10 text-red-600 border-red-500/30" },
  };
  const it = map[status] ?? { label: status, cls: "" };
  return <Badge variant="outline" className={it.cls}>{it.label}</Badge>;
}

function SchoolsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [province, setProvince] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [openCreate, setOpenCreate] = useState(false);

  const { data: schools = [] } = useQuery({
    queryKey: ["super-admin", "schools"],
    queryFn: async () => {
      const { data } = await supabase
        .from("schools")
        .select("*, students(count), teachers(count)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const provinces = useMemo(
    () => Array.from(new Set(schools.map((s: any) => s.province))).sort(),
    [schools],
  );

  const filtered = schools.filter((s: any) => {
    if (status !== "all" && s.status !== status) return false;
    if (province !== "all" && s.province !== province) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${s.name} ${s.principal_name ?? ""} ${s.city} ${s.province}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const setStatusFn = useServerFn(updateSchoolStatus);
  const deleteFn = useServerFn(deleteSchool);
  const resetFn = useServerFn(resetSchoolAdminPassword);
  const createFn = useServerFn(createSchool);

  const statusMutation = useMutation({
    mutationFn: (v: { schoolId: string; status: "active" | "pending" | "suspended" }) =>
      setStatusFn({ data: v }),
    onSuccess: (_r, v) => {
      toast.success(`École ${v.status === "active" ? "activée" : v.status === "suspended" ? "suspendue" : "en attente"}`);
      qc.invalidateQueries({ queryKey: ["super-admin"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const deleteMutation = useMutation({
    mutationFn: (schoolId: string) => deleteFn({ data: { schoolId } }),
    onSuccess: () => {
      toast.success("École supprimée");
      qc.invalidateQueries({ queryKey: ["super-admin"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const resetMutation = useMutation({
    mutationFn: (schoolId: string) => resetFn({ data: { schoolId } }),
    onSuccess: (r: any) => {
      if (r?.ok) toast.success(`Lien de réinitialisation envoyé à ${r.email}`);
      else toast.error("Aucun administrateur trouvé");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  return (
    <SuperAdminShell
      title="Écoles"
      subtitle={`${schools.length} école${schools.length > 1 ? "s" : ""} enregistrée${schools.length > 1 ? "s" : ""}`}
      search={search}
      onSearchChange={setSearch}
      actions={
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Ajouter</Button>
          </DialogTrigger>
          <CreateSchoolDialog
            onCreate={async (values) => {
              try {
                await createFn({ data: values });
                toast.success("École créée");
                setOpenCreate(false);
                qc.invalidateQueries({ queryKey: ["super-admin"] });
              } catch (e: any) {
                toast.error(e?.message ?? "Erreur");
              }
            }}
          />
        </Dialog>
      }
    >
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="w-40">
          <Label className="text-xs">Statut</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="suspended">Suspendue</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-52">
          <Label className="text-xs">Province</Label>
          <Select value={province} onValueChange={setProvince}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {provinces.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background overflow-hidden shadow-[var(--shadow-soft)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>École</TableHead>
              <TableHead>Province</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead>Principal</TableHead>
              <TableHead className="text-right">Élèves</TableHead>
              <TableHead className="text-right">Ens.</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Inscription</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s: any) => (
              <TableRow key={s.id} className="hover:bg-secondary/40">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
                      {s.logo_url ? (
                        <img src={s.logo_url} alt="" className="h-9 w-9 rounded-lg object-cover" />
                      ) : (
                        <Building2 className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <Link
                        to="/dashboard/super-admin/schools/$id"
                        params={{ id: s.id }}
                        className="font-medium hover:underline"
                      >
                        {s.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{s.email ?? "—"}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{s.province}</TableCell>
                <TableCell>{s.city}</TableCell>
                <TableCell>{s.principal_name ?? "—"}</TableCell>
                <TableCell className="text-right">{s.students?.[0]?.count ?? 0}</TableCell>
                <TableCell className="text-right">{s.teachers?.[0]?.count ?? 0}</TableCell>
                <TableCell><Badge variant="secondary" className="capitalize">{s.subscription_plan}</Badge></TableCell>
                <TableCell>{statusBadge(s.status)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(s.created_at).toLocaleDateString("fr-FR")}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard/super-admin/schools/$id" params={{ id: s.id }} className="gap-2">
                          <Eye className="h-4 w-4" /> Voir l'école
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard/super-admin/schools/$id" params={{ id: s.id }} className="gap-2">
                          <Pencil className="h-4 w-4" /> Éditer
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {s.status !== "active" && (
                        <DropdownMenuItem
                          className="gap-2"
                          onClick={() => statusMutation.mutate({ schoolId: s.id, status: "active" })}
                        >
                          <BadgeCheck className="h-4 w-4" /> Approuver / Activer
                        </DropdownMenuItem>
                      )}
                      {s.status !== "suspended" && (
                        <DropdownMenuItem
                          className="gap-2"
                          onClick={() => statusMutation.mutate({ schoolId: s.id, status: "suspended" })}
                        >
                          <Ban className="h-4 w-4" /> Suspendre
                        </DropdownMenuItem>
                      )}
                      {s.status === "suspended" && (
                        <DropdownMenuItem
                          className="gap-2"
                          onClick={() => statusMutation.mutate({ schoolId: s.id, status: "active" })}
                        >
                          <Play className="h-4 w-4" /> Réactiver
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="gap-2"
                        onClick={() => resetMutation.mutate(s.id)}
                      >
                        <KeyRound className="h-4 w-4" /> Réinitialiser mot de passe
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="gap-2">
                        <Link to="/dashboard/admin">
                          <ExternalLink className="h-4 w-4" /> Ouvrir le tableau école
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="gap-2 text-red-600 focus:text-red-600"
                        onClick={() => {
                          if (confirm(`Supprimer définitivement ${s.name} ?`)) {
                            deleteMutation.mutate(s.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" /> Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-10">
                  Aucune école ne correspond aux filtres.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </SuperAdminShell>
  );
}

function CreateSchoolDialog({
  onCreate,
}: {
  onCreate: (v: {
    name: string;
    province: string;
    city: string;
    principal_name?: string;
    email?: string;
    phone?: string;
  }) => Promise<void>;
}) {
  const [form, setForm] = useState({ name: "", province: "Kinshasa", city: "", principal_name: "", email: "", phone: "" });
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Ajouter une école</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Nom</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Province</Label>
            <Input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
          </div>
          <div>
            <Label>Ville</Label>
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Principal</Label>
          <Input value={form.principal_name} onChange={(e) => setForm({ ...form, principal_name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Email</Label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>Téléphone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onCreate(form)}>Créer</Button>
      </DialogFooter>
    </DialogContent>
  );
}