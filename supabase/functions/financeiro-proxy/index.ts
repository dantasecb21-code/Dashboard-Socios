import { corsHeaders } from "npm:@supabase/supabase-js/cors";

// Cache em memória do isolate (vale enquanto a função estiver "quente")
let cache: { body: string; status: number; at: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = Deno.env.get("FINANCEIRO_APPS_SCRIPT_URL");
    const token = Deno.env.get("FINANCEIRO_APPS_SCRIPT_TOKEN");

    if (!url || !token) {
      return new Response(
        JSON.stringify({ error: "Missing FINANCEIRO_APPS_SCRIPT_URL or FINANCEIRO_APPS_SCRIPT_TOKEN" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Serve cache se ainda válido
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
      return new Response(cache.body, {
        status: cache.status,
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT" },
      });
    }

    const sep = url.includes("?") ? "&" : "?";
    const upstream = `${url}${sep}token=${encodeURIComponent(token)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300_000); // 5 min
    let res: Response;
    try {
      res = await fetch(upstream, { redirect: "follow", signal: controller.signal });
    } catch (e) {
      clearTimeout(timeoutId);
      // Se temos cache antigo (mesmo expirado), devolve ele em vez de 504
      if (cache) {
        return new Response(cache.body, {
          status: cache.status,
          headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "STALE" },
        });
      }
      const isAbort = (e as Error)?.name === "AbortError";
      return new Response(
        JSON.stringify({
          error: isAbort
            ? "Apps Script demorou demais para responder. Tente novamente em alguns segundos."
            : `Falha no upstream: ${String(e)}`,
        }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    clearTimeout(timeoutId);
    const body = await res.text();

    // Não cacheia respostas de erro (ex: Unauthorized do Apps Script)
    const isErrorBody = body.includes('"error"');
    if (res.ok && !isErrorBody) {
      cache = { body, status: res.status, at: Date.now() };
    } else if (cache) {
      // upstream falhou, devolve stale
      return new Response(cache.body, {
        status: cache.status,
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "STALE" },
      });
    }

    return new Response(body, {
      status: res.status,
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "MISS" },
    });
  } catch (err) {
    console.error("financeiro-proxy error:", err);
    if (cache) {
      return new Response(cache.body, {
        status: cache.status,
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "STALE" },
      });
    }
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
