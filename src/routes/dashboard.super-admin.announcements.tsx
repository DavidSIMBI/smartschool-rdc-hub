import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";
import { SuperAdminShell } from "@/components/super-admin/SuperAdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendPlatformAnnouncement } from "@/lib/super-admin.functions";

export const Route = createFileRoute("/dashboard/super-admin/announcements")({
  head: () => ({ meta: [{ title: "Annonces — Super Admin" }, { name: "robots", content: "noindex" }] }),
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const send = useServerFn(sendPlatformAnnouncement);

  async function submit() {
    if (!title || !body) return;
    setLoading(true);
    try {
      const r = await send({ data: { title, body } });
      toast.success(`Envoyée à ${r.count} école${r.count > 1 ? "s" : ""}`);
      setTitle("");
      setBody("");
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SuperAdminShell title="Envoyer une annonce" subtitle="Diffusée à toutes les écoles">
      <div className="max-w-2xl rounded-2xl border border-border bg-background p-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Annonce plateforme</h2>
            <p className="text-xs text-muted-foreground">Publiée dans l'espace de chaque école.</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <Label>Titre</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <Button disabled={loading} onClick={submit}>
            {loading ? "Envoi…" : "Envoyer à toutes les écoles"}
          </Button>
        </div>
      </div>
    </SuperAdminShell>
  );
}