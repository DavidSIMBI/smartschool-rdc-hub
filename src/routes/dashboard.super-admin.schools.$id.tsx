import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, BadgeCheck, Ban, KeyRound, Trash2, Building2, Users, GraduationCap, ClipboardList, BookOpen, Megaphone, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SuperAdminShell, StatCard } from "@/components/super-admin/SuperAdminShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deleteSchool, resetSchoolAdminPassword, updateSchoolStatus } from "@/lib/super-admin.functions";

export const Route = createFileRoute("/dashboard/super-admin/schools/$id")({
  head: () => ({ meta: [{ title: "Détail école — Super Admin — SmartSchool RDC" }, { name: "robots", content: "noindex" }] }),
  component: SchoolDetail,
});

function SchoolDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["super-admin", "school", id],
    queryFn: async () => {
      const [school, students, teachers, classes, subjects, announcements, sub, activity] =
        await Promise.all([
          supabase.from("schools").select("*").eq("id", id).maybeSingle(),
          supabase.from("students").select("*").eq("school_id", id),
          supabase.from("teachers").select("*").eq("school_id", id),
          supabase.from("classes").select("*").eq("school_id", id),
          supabase.from("subjects").select("*").eq("school_id", id),
          supabase.from("announcements").select("*").eq("school_id", id).order("created_at", { ascending: false }),
          supabase.from("subscriptions").select("*").eq("school_id", id).maybeSingle(),
          supabase.from("activity_logs").select("*").eq("school_id", id).order("created_at", { ascending: false }).limit(20),
        ]);
      return {
        school: school.data,
        students: students.data ?? [],
        teachers: teachers.data ?? [],
        classes: classes.data ?? [],
        subjects: subjects.data ?? [],
        announcements: announcements.data ?? [],
        subscription: sub.data,
        activity: activity.data ?? [],
      };
    },
  });

  const setStatusFn = useServerFn(updateSchoolStatus);
  const deleteFn = useServerFn(deleteSchool);
  const resetFn = useServerFn(resetSchoolAdminPassword);

  const setStatus = useMutation({
    mutationFn: (status: "active" | "pending" | "suspended") =>
      setStatusFn({ data: { schoolId: id, status } }),
    onSuccess: () => {
      toast.success("Statut mis à jour");
      qc.invalidateQueries({ queryKey: ["super-admin"] });
    },
  });

  const del = useMutation({
    mutationFn: () => deleteFn({ data: { schoolId: id } }),
    onSuccess: () => {
      toast.success("École supprimée");
      navigate({ to: "/dashboard/super-admin/schools" });
    },
  });

  const reset = useMutation({
    mutationFn: () => resetFn({ data: { schoolId: id } }),
    onSuccess: (r: any) => toast.success(r?.ok ? `Lien envoyé à ${r.email}` : "Aucun admin"),
  });

  const s = data?.school;

  return (
    <SuperAdminShell
      title={s?.name ?? "École"}
      subtitle={s ? `${s.city}, ${s.province}` : ""}
      actions={
        <div className="flex gap-2">
          <Link to="/dashboard/super-admin/schools">
            <Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" /> Retour</Button>
          </Link>
        </div>
      }
    >
      {!s ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-background p-5 shadow-[var(--shadow-soft)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">{s.name}</h2>
                    <Badge variant="outline">{s.status}</Badge>
                    <Badge variant="secondary" className="capitalize">{s.subscription_plan}</Badge>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {s.principal_name ?? "—"} · {s.email ?? "—"} · {s.phone ?? "—"}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {s.status !== "active" && (
                  <Button size="sm" className="gap-2" onClick={() => setStatus.mutate("active")}>
                    <BadgeCheck className="h-4 w-4" /> Approuver / Activer
                  </Button>
                )}
                {s.status !== "suspended" && (
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => setStatus.mutate("suspended")}>
                    <Ban className="h-4 w-4" /> Suspendre
                  </Button>
                )}
                <Button size="sm" variant="outline" className="gap-2" onClick={() => reset.mutate()}>
                  <KeyRound className="h-4 w-4" /> Réinitialiser mot de passe
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 text-red-600 hover:text-red-600"
                  onClick={() => {
                    if (confirm("Supprimer définitivement cette école ?")) del.mutate();
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Supprimer
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Élèves" value={data.students.length} icon={Users} />
            <StatCard label="Enseignants" value={data.teachers.length} icon={GraduationCap} />
            <StatCard label="Classes" value={data.classes.length} icon={ClipboardList} />
            <StatCard label="Matières" value={data.subjects.length} icon={BookOpen} />
          </div>

          <Tabs defaultValue="profile" className="mt-6">
            <TabsList>
              <TabsTrigger value="profile">Profil</TabsTrigger>
              <TabsTrigger value="teachers">Enseignants</TabsTrigger>
              <TabsTrigger value="students">Élèves</TabsTrigger>
              <TabsTrigger value="classes">Classes</TabsTrigger>
              <TabsTrigger value="subjects">Matières</TabsTrigger>
              <TabsTrigger value="announcements">Annonces</TabsTrigger>
              <TabsTrigger value="subscription">Abonnement</TabsTrigger>
              <TabsTrigger value="activity">Activité</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-4">
              <div className="rounded-2xl border border-border bg-background p-5 grid sm:grid-cols-2 gap-3 text-sm">
                <Info label="Nom" value={s.name} />
                <Info label="Province" value={s.province} />
                <Info label="Ville" value={s.city} />
                <Info label="Adresse" value={s.address ?? "—"} />
                <Info label="Email" value={s.email ?? "—"} />
                <Info label="Téléphone" value={s.phone ?? "—"} />
                <Info label="Principal" value={s.principal_name ?? "—"} />
                <Info label="Créée le" value={new Date(s.created_at).toLocaleString("fr-FR")} />
              </div>
            </TabsContent>
            <TabsContent value="teachers" className="mt-4">
              <SimpleList
                empty="Aucun enseignant."
                items={data.teachers.map((t: any) => ({
                  id: t.id,
                  primary: `${t.first_name} ${t.last_name}`,
                  secondary: `${t.specialty ?? "—"} · ${t.email ?? ""}`,
                }))}
              />
            </TabsContent>
            <TabsContent value="students" className="mt-4">
              <SimpleList
                empty="Aucun élève."
                items={data.students.map((t: any) => ({
                  id: t.id,
                  primary: `${t.first_name} ${t.last_name}`,
                  secondary: `${t.matricule ?? ""} · ${t.gender ?? ""}`,
                }))}
              />
            </TabsContent>
            <TabsContent value="classes" className="mt-4">
              <SimpleList
                empty="Aucune classe."
                items={data.classes.map((c: any) => ({ id: c.id, primary: c.name, secondary: c.level ?? "" }))}
              />
            </TabsContent>
            <TabsContent value="subjects" className="mt-4">
              <SimpleList
                empty="Aucune matière."
                items={data.subjects.map((c: any) => ({ id: c.id, primary: c.name, secondary: c.code ?? "" }))}
              />
            </TabsContent>
            <TabsContent value="announcements" className="mt-4">
              <SimpleList
                empty="Aucune annonce."
                items={data.announcements.map((a: any) => ({
                  id: a.id,
                  primary: a.title,
                  secondary: a.body ?? "",
                }))}
                icon={Megaphone}
              />
            </TabsContent>
            <TabsContent value="subscription" className="mt-4">
              {data.subscription ? (
                <div className="rounded-2xl border border-border bg-background p-5 grid sm:grid-cols-2 gap-3 text-sm">
                  <Info label="Plan" value={data.subscription.plan} />
                  <Info label="Statut" value={data.subscription.status} />
                  <Info label="Prix mensuel" value={`${data.subscription.monthly_price} ${data.subscription.currency}`} />
                  <Info label="Période" value={`${new Date(data.subscription.current_period_start).toLocaleDateString("fr-FR")} → ${new Date(data.subscription.current_period_end).toLocaleDateString("fr-FR")}`} />
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Aucun abonnement.</div>
              )}
            </TabsContent>
            <TabsContent value="activity" className="mt-4">
              <SimpleList
                empty="Aucune activité."
                icon={Activity}
                items={data.activity.map((a: any) => ({
                  id: a.id,
                  primary: a.action,
                  secondary: `${a.actor_name ?? "Système"} · ${new Date(a.created_at).toLocaleString("fr-FR")}`,
                }))}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </SuperAdminShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function SimpleList({
  items,
  empty,
  icon: Icon,
}: {
  items: { id: string; primary: string; secondary: string }[];
  empty: string;
  icon?: any;
}) {
  if (!items.length)
    return <div className="text-sm text-muted-foreground">{empty}</div>;
  return (
    <ul className="rounded-2xl border border-border bg-background divide-y divide-border">
      {items.map((i) => (
        <li key={i.id} className="flex items-center gap-3 p-3 text-sm">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
          <div className="min-w-0">
            <div className="font-medium truncate">{i.primary}</div>
            <div className="text-xs text-muted-foreground truncate">{i.secondary}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}