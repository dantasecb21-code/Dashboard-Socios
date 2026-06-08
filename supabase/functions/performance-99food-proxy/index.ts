import { corsHeaders } from "npm:@supabase/supabase-js/cors";

// Normaliza string removendo acentos, lowercase, trim
function norm(v: unknown): string {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/[^\d,.\-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

// Status loja: "Ativo " -> "Ativa", "Em Cancelamento" -> "Em cancelamento"
function normStatusLoja(v: unknown): string {
  const s = norm(v);
  if (!s) return "";
  if (s.includes("cancel")) return "Em cancelamento";
  if (s.startsWith("ativ") || s.includes("ativ")) return "Ativa";
  if (s.includes("paus")) return "Pausada";
  return toStr(v);
}

// Extrai status (Crescimento/Estável/Queda) e variação % do campo "🔵 Estável 0%"
function parseStatusRaw(raw: unknown): { status: string; variacaoPct: number | null; statusRaw: string } {
  const s = toStr(raw);
  const lower = norm(s);
  let status = "Indefinido";
  if (lower.includes("cresc")) status = "Crescimento";
  else if (lower.includes("estav") || lower.includes("estável") || lower.includes("estavel")) status = "Estável";
  else if (lower.includes("queda")) status = "Queda";

  const m = s.match(/(-?\d+(?:[.,]\d+)?)\s*%/);
  const variacaoPct = m ? parseFloat(m[1].replace(",", ".")) : null;
  return { status, variacaoPct, statusRaw: s };
}

function pick(r: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    const v = r[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

function mapRow(r: Record<string, unknown>) {
  const statusRawSrc = pick(r, "statusRaw", "status") ?? r["status"];
  const statusInfo = parseStatusRaw(statusRawSrc);
  const prev = toStr(pick(r, "previsibilidade", "prevClassRaw"));
  return {
    id: toStr(pick(r, "id")),
    loja: toStr(pick(r, "loja", "nome_da_loja")),
    fidelidade: toStr(pick(r, "fidelidade")),
    garantia: toStr(pick(r, "garantia")),
    garantiaAtingida: toStr(pick(r, "garantiaAtingida", "garantia_atingida_sim_nao")),
    dataQuandoAtingiu: toStr(pick(r, "dataQuandoAtingiu", "data_de_quando_atingiu")),
    ltv: toStr(pick(r, "ltv")),
    dataUltimaEstrategia: toStr(pick(r, "dataUltimaEstrategia", "dataUltEstrategia", "data_da_ultima_estrategia")),
    dataOtimizacao: toStr(pick(r, "dataOtimizacao", "data_de_otimizacao")),
    dataEntrega: toStr(pick(r, "dataEntrega", "data_de_entrega_da_estrategia")),
    gestor: toStr(pick(r, "gestor", "_gerente")),
    gestorAba: toStr(pick(r, "gestorAba", "_gerente", "gestor")),
    estrategista: toStr(pick(r, "estrategista")),
    comunicacao: toStr(pick(r, "comunicacao", "comunicacao_com_o_cliente")),
    dataEntrada: toStr(pick(r, "dataEntrada", "data_de_entrada")),
    fatInicial: toNumber(pick(r, "fatInicial", "faturamento_inicial_liquido")),
    fatMesAnterior: toNumber(pick(r, "fatMesAnterior", "faturamento_liquido_mes_anterior")),
    fatAtual: toNumber(pick(r, "fatAtual", "faturamento_liquido_atual")),
    tempoAberto: toStr(pick(r, "tempoAberto", "tempo_aberto_ultimos_30_dias")),
    fatUlt15: toNumber(pick(r, "fatUlt15", "faturamento_liquido_01_a_15")),
    fatPrev15: toNumber(pick(r, "fatPrev15", "fatUlt15", "faturamento_liquido_01_a_15")),
    statusLoja: normStatusLoja(pick(r, "statusLoja", "status_loja")),
    status: statusInfo.status,
    variacaoPct: statusInfo.variacaoPct,
    statusRaw: statusInfo.statusRaw,
    ultAtualizacao: toStr(pick(r, "ultAtualizacao", "ultima_atualizacao_da_planilha")),
    observacao: toStr(pick(r, "observacao", "observacao_da_loja")),
    historico: toStr(pick(r, "historico")),
    estado: toStr(pick(r, "estado")),
    nicho: toStr(pick(r, "nicho")),
    previsibilidade: prev,
    prevClassRaw: prev,
    plataforma: "99Food",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = Deno.env.get("PERFORMANCE_99FOOD_APPS_SCRIPT_URL");
    const token = Deno.env.get("PERFORMANCE_99FOOD_APPS_SCRIPT_TOKEN");

    if (!url || !token) {
      return new Response(
        JSON.stringify({ error: "Missing PERFORMANCE_99FOOD_APPS_SCRIPT_URL or PERFORMANCE_99FOOD_APPS_SCRIPT_TOKEN" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sep = url.includes("?") ? "&" : "?";
    const upstream = `${url}${sep}token=${encodeURIComponent(token)}`;

    const res = await fetch(upstream, { redirect: "follow" });
    const text = await res.text();

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      return new Response(JSON.stringify({ error: "Upstream did not return JSON", raw: text.slice(0, 500) }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (parsed?.error) {
      return new Response(JSON.stringify({ error: parsed.error, rows: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawRows: Record<string, unknown>[] = Array.isArray(parsed?.data)
      ? parsed.data
      : Array.isArray(parsed?.rows)
        ? parsed.rows
        : [];

    const rows = rawRows
      .map(mapRow)
      .filter((r) => r.id || r.loja);

    return new Response(JSON.stringify({ rows, total: rows.length, sheets: parsed?.sheets ?? [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("performance-99food-proxy error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
