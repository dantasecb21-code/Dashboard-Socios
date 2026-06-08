import { corsHeaders } from "npm:@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const url = Deno.env.get("RH_FOLHA_APPS_SCRIPT_URL");
    const token = Deno.env.get("RH_FOLHA_APPS_SCRIPT_TOKEN");
    if (!url || !token) {
      return new Response(
        JSON.stringify({ error: "Missing RH_FOLHA_APPS_SCRIPT_URL or RH_FOLHA_APPS_SCRIPT_TOKEN" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const reqUrl = new URL(req.url);
    const only = reqUrl.searchParams.get("only") || "";
    const sep = url.includes("?") ? "&" : "?";
    let upstream = `${url}${sep}token=${encodeURIComponent(token)}`;
    if (only) upstream += `&only=${encodeURIComponent(only)}`;
    const res = await fetch(upstream, { redirect: "follow" });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("rh-folha-proxy error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
