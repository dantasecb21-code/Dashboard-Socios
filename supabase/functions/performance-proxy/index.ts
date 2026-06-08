import { corsHeaders } from "npm:@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = (Deno.env.get("PERFORMANCE_APPS_SCRIPT_URL") || "").trim();
    const token = (Deno.env.get("PERFORMANCE_APPS_SCRIPT_TOKEN") || "").trim();

    if (!url || !token) {
      return new Response(
        JSON.stringify({ error: "Missing PERFORMANCE_APPS_SCRIPT_URL or PERFORMANCE_APPS_SCRIPT_TOKEN" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sep = url.includes("?") ? "&" : "?";
    const upstream = `${url}${sep}token=${encodeURIComponent(token)}`;
    console.log("performance-proxy upstream URL:", upstream);

    const res = await fetch(upstream, { redirect: "follow" });
    const body = await res.text();

    return new Response(body, {
      status: res.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("performance-proxy error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
