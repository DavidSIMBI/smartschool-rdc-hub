import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Send, Mail } from "lucide-react";
import { toast } from "sonner";
import { TeacherShell } from "@/components/dashboard/TeacherShell";
import { Button } from "@/components/ui/button";
import { listMessages, sendMessage, markMessageRead } from "@/lib/teacher.functions";

export const Route = createFileRoute("/dashboard/teacher/messages")({
  head: () => ({ meta: [{ title: "Messages — Enseignant" }, { name: "robots", content: "noindex" }] }),
  component: MessagesPage,
});

function MessagesPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMessages);
  const sendFn = useServerFn(sendMessage);
  const readFn = useServerFn(markMessageRead);
  const { data } = useQuery({ queryKey: ["teacher", "messages"], queryFn: () => listFn() });
  const [form, setForm] = useState({ recipient_id: "", subject: "", body: "" });

  const send = useMutation({
    mutationFn: () => sendFn({ data: { recipient_id: form.recipient_id, subject: form.subject, body: form.body } }),
    onSuccess: () => { toast.success("Envoyé"); qc.invalidateQueries({ queryKey: ["teacher", "messages"] }); setForm({ recipient_id: "", subject: "", body: "" }); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  return (
    <TeacherShell title="Messagerie" subtitle="Communiquez avec vos collègues et l'administration">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-background p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4">Boîte de réception</h2>
          {((data?.inbox ?? []) as any[]).length === 0 ? (
            <div className="text-sm text-muted-foreground p-6 text-center"><Mail className="h-6 w-6 mx-auto opacity-50 mb-2" />Aucun message.</div>
          ) : (
            <ul className="space-y-2">
              {((data?.inbox ?? []) as any[]).map((m) => (
                <li key={m.id} className={`p-4 rounded-lg border ${m.read_at ? "border-border bg-background" : "border-primary/30 bg-primary/5"}`}
                    onClick={() => !m.read_at && readFn({ data: { id: m.id } }).then(() => qc.invalidateQueries({ queryKey: ["teacher", "messages"] }))}>
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">{m.subject ?? "(sans objet)"}</div>
                    <div className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("fr-FR")}</div>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{m.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-background p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4">Nouveau message</h2>
          <div className="space-y-3">
            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.recipient_id} onChange={(e) => setForm((f) => ({ ...f, recipient_id: e.target.value }))}>
              <option value="">Destinataire…</option>
              {((data?.colleagues ?? []) as any[]).map((c) => (
                <option key={c.id} value={c.id}>{c.full_name ?? c.email}</option>
              ))}
            </select>
            <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Objet" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
            <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px]" placeholder="Message…" value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
            <Button className="w-full gap-2" disabled={!form.recipient_id || !form.body || send.isPending} onClick={() => send.mutate()}>
              <Send className="h-4 w-4" /> Envoyer
            </Button>
          </div>
        </div>
      </div>
    </TeacherShell>
  );
}