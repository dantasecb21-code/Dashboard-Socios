import { corsHeaders } from "npm:@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const url = Deno.env.get("COMERCIAL_SALVADOR_APPS_SCRIPT_URL")
      ?? "https://script.google.com/macros/s/AKfycbywoVkKK4BIra80u-ZkqNdT8vO2QT9f7fyCjKFQNf_FhragbBzCGcLghIUy-4njGg1H9w/exec";
    const token = Deno.env.get("COMERCIAL_SALVADOR_APPS_SCRIPT_TOKEN")
      ?? "27aa3305-f499-4288-88c2-a52a4d5d1ef3";
    if (!url || !token) {
      return new Response(
        JSON.stringify({ error: "Missing COMERCIAL_SALVADOR_APPS_SCRIPT_URL or COMERCIAL_SALVADOR_APPS_SCRIPT_TOKEN" }),
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
    console.error("comercial-salvador-proxy error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
