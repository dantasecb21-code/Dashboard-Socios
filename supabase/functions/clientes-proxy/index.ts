import { corsHeaders } from "npm:@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const url =
      Deno.env.get("CLIENTES_APPS_SCRIPT_URL") ??
      "https://script.google.com/macros/s/AKfycbzovnxDhonXy_0hxfxX6m1QJQzLaeEGSkyBtaicjv9G18bmx1AL1b9Ey98a3WsgMpZu/exec";

    if (!url) {
      return new Response(
        JSON.stringify({ error: "Missing CLIENTES_APPS_SCRIPT_URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sep = url.includes("?") ? "&" : "?";
    const upstream = `${url}${sep}t=${Date.now()}`;
    const res = await fetch(upstream, { redirect: "follow" });
    const body = await res.text();

    return new Response(body, {
      status: res.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("clientes-proxy error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
