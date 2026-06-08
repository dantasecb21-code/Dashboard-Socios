import { corsHeaders } from "npm:@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = Deno.env.get("ESTRATEGIAS_APPS_SCRIPT_URL");
    const token = Deno.env.get("ESTRATEGIAS_APPS_SCRIPT_TOKEN");

    if (!url || !token) {
      return new Response(
        JSON.stringify({ error: "Missing ESTRATEGIAS_APPS_SCRIPT_URL or ESTRATEGIAS_APPS_SCRIPT_TOKEN", rows: [], summary: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sep = url.includes("?") ? "&" : "?";
    const upstream = `${url}${sep}token=${encodeURIComponent(token)}`;

    // Retry upstream up to 3 times — Apps Script frequently throws
    // "O tempo de execução JavaScript foi interrompido" transient errors.
    let lastBody = "";
    let lastStatus = 0;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 55_000);
        const res = await fetch(upstream, { redirect: "follow", signal: controller.signal });
        clearTimeout(timeout);
        lastStatus = res.status;
        lastBody = await res.text();

        const trimmed = lastBody.trimStart();
        const looksJson = trimmed.startsWith("{") || trimmed.startsWith("[");
        if (res.ok && looksJson) {
          return new Response(lastBody, {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (e) {
        lastBody = String(e);
      }
      // small backoff
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }

    // Upstream failed (HTML error page from Apps Script, timeout, etc.)
    // Return 200 with an empty payload so the UI keeps working with cached data.
    console.warn("estrategias-proxy upstream failed", lastStatus, lastBody.slice(0, 300));
    return new Response(
      JSON.stringify({
        error: "Apps Script upstream error (likely script timeout). Try again in a few seconds.",
        upstreamStatus: lastStatus,
        rows: [],
        summary: null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("estrategias-proxy error:", err);
    return new Response(
      JSON.stringify({ error: String(err), rows: [], summary: null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
