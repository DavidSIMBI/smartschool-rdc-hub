import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { StudentShell } from "@/components/dashboard/StudentShell";
import { searchStudent } from "@/lib/student.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, BookOpen, ClipboardList, FolderOpen, Megaphone, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/dashboard/student/search")({
  validateSearch: (s: Record<string, unknown>): { q: string } => ({
    q: typeof s.q === "string" ? s.q : "",
  }),
  head: () => ({
    meta: [
      { title: "Recherche — Espace élève | SmartSchool RDC" },
      { name: "description", content: "Rechercher dans vos matières, devoirs, ressources, annonces et messages." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SearchPage,
});

function highlight(text: string | null | undefined, needle: string) {
  if (!text) return null;
  if (!needle) return text;
  const idx = text.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-foreground rounded px-0.5">{text.slice(idx, idx + needle.length)}</mark>
      {text.slice(idx + needle.length)}
    </>
  );
}

function snippet(text: string | null | undefined, needle: string, radius = 80) {
  if (!text) return "";
  const idx = text.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) return text.slice(0, radius * 2);
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + needle.length + radius);
  return (start > 0 ? "… " : "") + text.slice(start, end) + (end < text.length ? " …" : "");
}

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const [input, setInput] = useState(q);

  const query = useQuery({
    queryKey: ["student-search", q],
    queryFn: () => searchStudent({ data: { q } }),
    enabled: q.trim().length > 0,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = input.trim();
    if (!next) return;
    navigate({ to: "/dashboard/student/search", search: { q: next } });
  };

  const results = query.data;
  const total =
    (results?.subjects.length ?? 0) +
    (results?.assignments.length ?? 0) +
    (results?.materials.length ?? 0) +
    (results?.announcements.length ?? 0) +
    (results?.messages.length ?? 0);

  return (
    <StudentShell
      title="Recherche"
      subtitle={q ? `Résultats pour “${q}”` : "Rechercher dans votre espace"}
    >
      <form onSubmit={submit} className="flex gap-2 mb-6 max-w-2xl">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Rechercher matières, devoirs, ressources, annonces, messages…"
            className="pl-9 h-11"
          />
        </div>
        <Button type="submit" className="h-11">Rechercher</Button>
      </form>

      {!q ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
          Saisissez un terme pour rechercher.
        </div>
      ) : query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-secondary/40 animate-pulse" />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
          Aucun résultat pour “{q}”.
        </div>
      ) : (
        <div className="space-y-8">
          <ResultGroup
            label="Matières"
            icon={BookOpen}
            count={results!.subjects.length}
            emptyHidden
          >
            {results!.subjects.map((s: any) => (
              <Link
                key={s.id}
                to="/dashboard/student/subjects"
                className="block rounded-xl border border-border bg-background/70 backdrop-blur-sm p-4 hover:border-primary/40 transition"
              >
                <div className="font-medium">{highlight(s.name, q)}</div>
                {s.code && <div className="text-xs text-muted-foreground mt-1">Code : {highlight(s.code, q)}</div>}
              </Link>
            ))}
          </ResultGroup>

          <ResultGroup
            label="Devoirs"
            icon={ClipboardList}
            count={results!.assignments.length}
            emptyHidden
          >
            {results!.assignments.map((a: any) => (
              <Link
                key={a.id}
                to="/dashboard/student/assignments"
                className="block rounded-xl border border-border bg-background/70 backdrop-blur-sm p-4 hover:border-primary/40 transition"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{highlight(a.title, q)}</div>
                  <span className="text-[10px] uppercase tracking-wider rounded-full bg-secondary px-2 py-0.5">
                    {a.status}
                  </span>
                </div>
                {a.instructions && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {highlight(snippet(a.instructions, q), q)}
                  </p>
                )}
                <div className="text-xs text-muted-foreground mt-2">
                  {a.subjects?.name ?? "—"}
                  {a.due_date ? ` · échéance ${new Date(a.due_date).toLocaleDateString()}` : ""}
                </div>
              </Link>
            ))}
          </ResultGroup>

          <ResultGroup
            label="Ressources"
            icon={FolderOpen}
            count={results!.materials.length}
            emptyHidden
          >
            {results!.materials.map((m: any) => (
              <Link
                key={m.id}
                to="/dashboard/student/materials"
                className="block rounded-xl border border-border bg-background/70 backdrop-blur-sm p-4 hover:border-primary/40 transition"
              >
                <div className="font-medium">{highlight(m.name, q)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {m.subjects?.name ?? m.kind ?? "Document"} · {new Date(m.created_at).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </ResultGroup>

          <ResultGroup
            label="Annonces"
            icon={Megaphone}
            count={results!.announcements.length}
            emptyHidden
          >
            {results!.announcements.map((a: any) => (
              <Link
                key={a.id}
                to="/dashboard/student/announcements"
                className="block rounded-xl border border-border bg-background/70 backdrop-blur-sm p-4 hover:border-primary/40 transition"
              >
                <div className="font-medium">{highlight(a.title, q)}</div>
                {a.body && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {highlight(snippet(a.body, q), q)}
                  </p>
                )}
                <div className="text-xs text-muted-foreground mt-2">
                  {new Date(a.created_at).toLocaleString()}
                </div>
              </Link>
            ))}
          </ResultGroup>

          <ResultGroup
            label="Messages"
            icon={MessageSquare}
            count={results!.messages.length}
            emptyHidden
          >
            {results!.messages.map((m: any) => (
              <Link
                key={m.id}
                to="/dashboard/student/messages"
                className="block rounded-xl border border-border bg-background/70 backdrop-blur-sm p-4 hover:border-primary/40 transition"
              >
                <div className="font-medium">{highlight(m.subject || "(sans sujet)", q)}</div>
                {m.body && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {highlight(snippet(m.body, q), q)}
                  </p>
                )}
                <div className="text-xs text-muted-foreground mt-2">
                  {new Date(m.created_at).toLocaleString()}
                </div>
              </Link>
            ))}
          </ResultGroup>
        </div>
      )}
    </StudentShell>
  );
}

function ResultGroup({
  label,
  icon: Icon,
  count,
  emptyHidden,
  children,
}: {
  label: string;
  icon: any;
  count: number;
  emptyHidden?: boolean;
  children: React.ReactNode;
}) {
  if (emptyHidden && count === 0) return null;
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {label} <span className="text-foreground">({count})</span>
        </h2>
      </div>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}