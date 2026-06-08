import { corsHeaders } from "npm:@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const url = Deno.env.get("COMERCIAL_SP_GERAL_APPS_SCRIPT_URL");
    const token = Deno.env.get("COMERCIAL_SP_GERAL_APPS_SCRIPT_TOKEN");
    if (!url || !token) {
      return new Response(
        JSON.stringify({ error: "Missing COMERCIAL_SP_GERAL_APPS_SCRIPT_URL or COMERCIAL_SP_GERAL_APPS_SCRIPT_TOKEN" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const sep = url.includes("?") ? "&" : "?";
    const upstream = `${url}${sep}token=${encodeURIComponent(token)}`;
    const res = await fetch(upstream, { redirect: "follow" });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("comercial-sp-geral-proxy error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
