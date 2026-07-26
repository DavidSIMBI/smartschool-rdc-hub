import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { StudentShell } from "@/components/dashboard/StudentShell";
import { askStudentAssistant } from "@/lib/student.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/student/assistant")({ component: AssistantPage });

type Msg = { role: "user" | "assistant"; content: string };

function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Bonjour ! Je suis ton assistant SmartSchool. Pose-moi une question sur tes devoirs, tes révisions ou tes cours." },
  ]);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const ask = useMutation({
    mutationFn: (msgs: Msg[]) => askStudentAssistant({ data: { messages: msgs } }),
    onSuccess: (res: any) => {
      setMessages((m) => [...m, { role: "assistant", content: res.reply || "…" }]);
      setTimeout(() => listRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }), 50);
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur IA"),
  });

  async function send() {
    const q = input.trim();
    if (!q || ask.isPending) return;
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    ask.mutate(next);
  }

  const suggestions = [
    "Explique-moi la photosynthèse simplement",
    "Aide-moi à planifier mes révisions cette semaine",
    "Comment résoudre une équation du second degré ?",
    "Donne-moi des astuces pour mémoriser du vocabulaire",
  ];

  return (
    <StudentShell title="Assistant IA" subtitle="Réponses pédagogiques personnalisées">
      <div className="max-w-3xl mx-auto">
        <div ref={listRef} className="rounded-2xl border border-border bg-background/70 backdrop-blur-sm p-4 h-[55vh] overflow-y-auto space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && (
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary"><Sparkles className="h-4 w-4" /></div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                {m.content}
              </div>
            </div>
          ))}
          {ask.isPending && (
            <div className="flex gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary"><Sparkles className="h-4 w-4" /></div>
              <div className="rounded-2xl bg-secondary px-4 py-2 text-sm animate-pulse">L'assistant réfléchit…</div>
            </div>
          )}
        </div>

        {messages.length <= 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button key={s} onClick={() => setInput(s)} className="text-xs rounded-full border border-border bg-background/70 px-3 py-1.5 hover:bg-secondary transition-colors">
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Écris ta question…"
            rows={2}
            className="flex-1"
          />
          <Button onClick={send} disabled={ask.isPending || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </StudentShell>
  );
}