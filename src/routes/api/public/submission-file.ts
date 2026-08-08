import { createFileRoute } from "@tanstack/react-router";

const PREVIEWABLE = /^(application\/pdf|image\/)/;

export const Route = createFileRoute("/api/public/submission-file")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("t") ?? "";
        const mode = url.searchParams.get("mode") === "download" ? "download" : "view";

        const { verifyFileToken } = await import("@/lib/file-token.server");
        const payload = await verifyFileToken(token);
        if (!payload) {
          return new Response("Lien expiré ou invalide.", { status: 403 });
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin.storage.from(payload.b).download(payload.p);
          if (error || !data) throw error ?? new Error("empty body");

          const type = payload.t || data.type || "application/octet-stream";
          const inline = mode === "view" && PREVIEWABLE.test(type);
          const safeName = (payload.n || "fichier").replace(/["\\\r\n]/g, "_");
          return new Response(data, {
            headers: {
              "content-type": type,
              "content-disposition": `${inline ? "inline" : "attachment"}; filename="${safeName}"`,
              "cache-control": "private, no-store",
            },
          });
        } catch (e) {
          console.error("[submission-file] download failed", { path: payload.p, error: e });
          return new Response("Impossible d'ouvrir ce fichier. Veuillez réessayer.", { status: 502 });
        }
      },
    },
  },
});
