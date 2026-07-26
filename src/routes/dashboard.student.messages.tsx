import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StudentShell } from "@/components/dashboard/StudentShell";
import { listStudentMessages, sendStudentMessage, markMessageRead } from "@/lib/student.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send, MailOpen } from "lucide-react";

export const Route = createFileRoute("/dashboard/student/messages")({ component: MessagesPage });

function MessagesPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["student-messages"], queryFn: () => listStudentMessages() });
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [tab, setTab] = useState<"inbox" | "sent" | "compose">("inbox");

  const send = useMutation({
    mutationFn: (p: any) => sendStudentMessage({ data: p }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["student-messages"] }); setBody(""); setSubject(""); setTab("sent"); toast.success("Message envoyé"); },
    onError: (e: any) => toast.error(e.message ?? "Échec"),
  });
  const readMut = useMutation({
    mutationFn: (id: string) => markMessageRead({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["student-messages"] }),
  });

  const inbox = data?.inbox ?? [];
  const sent = data?.sent ?? [];
  const recipients = data?.recipients ?? [];

  return (
    <StudentShell title="Messages" subtitle="Communiquez avec vos enseignants et le personnel">
      <div className="flex gap-2 mb-4">
        {(["inbox", "sent", "compose"] as const).map((t) => (
          <Button key={t} variant={tab === t ? "default" : "outline"} size="sm" onClick={() => setTab(t)}>
            {t === "inbox" ? "Reçus" : t === "sent" ? "Envoyés" : "Nouveau"}
          </Button>
        ))}
      </div>

      {tab === "compose" ? (
        <div className="rounded-2xl border border-border bg-background/70 backdrop-blur-sm p-5 space-y-3 max-w-2xl">
          <select value={recipient} onChange={(e) => setRecipient(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">Choisir un destinataire…</option>
            {(recipients as any[]).map((r) => (
              <option key={r.id} value={r.id}>{r.full_name ?? r.email}</option>
            ))}
          </select>
          <Input placeholder="Sujet (optionnel)" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Textarea placeholder="Votre message…" value={body} onChange={(e) => setBody(e.target.value)} rows={6} />
          <Button
            disabled={!recipient || !body || send.isPending}
            onClick={() => send.mutate({ recipient_id: recipient, subject: subject || null, body })}
          >
            <Send className="h-4 w-4 mr-2" />Envoyer
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-background/70 backdrop-blur-sm divide-y divide-border">
          {(tab === "inbox" ? inbox : sent).length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">Aucun message.</div>
          ) : (tab === "inbox" ? inbox : sent).map((m: any) => (
            <div key={m.id} className={`p-4 ${!m.read_at && tab === "inbox" ? "bg-primary/5" : ""}`}>
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{m.subject ?? "(Sans sujet)"}</div>
                  <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{m.body}</div>
                  <div className="text-xs text-muted-foreground mt-2">{new Date(m.created_at).toLocaleString()}</div>
                </div>
                {tab === "inbox" && !m.read_at && (
                  <Button size="sm" variant="ghost" onClick={() => readMut.mutate(m.id)}>
                    <MailOpen className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </StudentShell>
  );
}