import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/public/tmp-sign")({
  server: { handlers: { GET: async ({ request }) => {
    const p = new URL(request.url).searchParams.get("p")!;
    const { signFileToken } = await import("@/lib/file-token.server");
    return new Response(await signFileToken({ b: "teacher-materials", p, n: "Group Assignment.pdf", t: "application/pdf" }));
  } } },
});
