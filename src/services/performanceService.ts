import { supabase } from "@/integrations/supabase/client";

export interface PerformanceLoja {
  id: string;
  loja: string;
  fidelidade: string;
  garantia: string;
  garantiaAtingida?: string;
  dataQuandoAtingiu?: string;
  estrategista: string;
  gestor: string;
  gestorAba: string;
  dataEntrada: string | null;
  dataUltimaEstrategia: string | null;
  dataOtimizacao: string | null;
  dataEntrega: string | null;
  fatInicial: number | null;
  fatMesAnterior: number | null;
  fatAtual: number | null;
  fatUlt15: number | null;
  fatPrev15?: number | null;
  prevClassRaw?: string;
  tempoAberto: string;
  ltv?: string;
  statusLoja: string;          // "Ativa" | "Em cancelamento" | ""
  status: string;              // "Crescimento" | "Estável" | "Queda" | "Indefinido"
  variacaoPct: number | null;
  statusRaw: string;
  ultAtualizacao: string | null;
  observacao: string;
  historico: string;
  plataforma: string;
  estado?: string;
  nicho?: string;
}

export interface PerformanceCrosstab {
  crescimento: number;
  estavel: number;
  queda: number;
  novas: number;
  total: number;
}

export interface PerformanceSummary {
  total: number;
  crescimento: number;
  estavel: number;
  queda: number;
  novas: number;
  ativas: number;
  emCancelamento: number;
  porPlataforma: Record<string, number>;
  porGestor: Record<string, PerformanceCrosstab>;
  porEstrategista: Record<string, PerformanceCrosstab>;
}

export interface PerformanceResult {
  rows: PerformanceLoja[];
  summary: PerformanceSummary;
}

const emptySummary: PerformanceSummary = {
  total: 0,
  crescimento: 0,
  estavel: 0,
  queda: 0,
  novas: 0,
  ativas: 0,
  emCancelamento: 0,
  porPlataforma: {},
  porGestor: {},
  porEstrategista: {},
};

export function isLojaNova(r: { statusRaw?: string; status?: string }): boolean {
  const s = `${r.statusRaw || ""} ${r.status || ""}`.toUpperCase();
  return /\bNOVA\b|LOJA\s*NOVA/.test(s);
}

export type PrevisibilidadeClass = "saudavel" | "estavel" | "estrategia" | "critica" | "nao";

export interface PrevisibilidadeResult {
  classe: PrevisibilidadeClass;
  label: string;
  emoji: string;
  pct: number | null;        // variação proj. vs. fat inicial
  projecao: number | null;   // projeção mensal
}

function classifyFromText(raw: string): PrevisibilidadeClass | null {
  const up = raw
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  if (!up.trim()) return null;
  if (/QUEDA\s*CRITIC|CRITIC/.test(up)) return "critica";
  if (/ESTRATEG|PRECISA/.test(up)) return "estrategia";
  if (/SAUDAV|CRESC/.test(up)) return "saudavel";
  if (/ESTAV/.test(up)) return "estavel";
  if (/NAO\s*ANALIS|PAUSAD|SEM\s*DAD/.test(up)) return "nao";
  return null;
}

/**
 * Classificação por previsibilidade: vem da classificação da planilha.
 * A projeção mensal continua sendo calculada pelo faturamento de 01–15.
 */
export function computePrevisibilidade(r: PerformanceLoja): PrevisibilidadeResult {
  const labels: Record<PrevisibilidadeClass, { label: string; emoji: string }> = {
    saudavel: { label: "Crescimento saudável", emoji: "🟢" },
    estavel:  { label: "Estável",              emoji: "🔵" },
    estrategia:{ label: "Precisa de estratégia", emoji: "🟠" },
    critica:  { label: "Queda crítica",        emoji: "🔴" },
    nao:      { label: "Não analisar",         emoji: "⚪" },
  };

  const fat15 = r.fatPrev15 ?? r.fatUlt15;
  const fatIni = r.fatInicial;
  const projecao = fat15 != null ? (fat15 / 15) * 30 : null;
  const pct = projecao != null && fatIni ? (projecao / fatIni) - 1 : null;

  const fromText = r.prevClassRaw ? classifyFromText(r.prevClassRaw) : null;
  if (fromText) {
    return { ...labels[fromText], classe: fromText, pct, projecao };
  }
  return { ...labels.nao, classe: "nao", pct: null, projecao };
}

function buildSummary(rows: PerformanceLoja[]): PerformanceSummary {
  const sum: PerformanceSummary = {
    total: rows.length,
    crescimento: 0, estavel: 0, queda: 0, novas: 0,
    ativas: 0, emCancelamento: 0,
    porPlataforma: {}, porGestor: {}, porEstrategista: {},
  };
  const emptyCross = (): PerformanceCrosstab => ({ crescimento: 0, estavel: 0, queda: 0, novas: 0, total: 0 });
  for (const r of rows) {
    const nova = isLojaNova(r);
    if (nova) sum.novas++;
    else if (r.status === "Crescimento") sum.crescimento++;
    else if (r.status === "Estável") sum.estavel++;
    else if (r.status === "Queda") sum.queda++;
    if (r.statusLoja === "Ativa") sum.ativas++;
    else if (r.statusLoja === "Em cancelamento") sum.emCancelamento++;
    if (r.plataforma) sum.porPlataforma[r.plataforma] = (sum.porPlataforma[r.plataforma] || 0) + 1;
    if (r.gestor) {
      if (!sum.porGestor[r.gestor]) sum.porGestor[r.gestor] = emptyCross();
      sum.porGestor[r.gestor].total++;
      if (nova) sum.porGestor[r.gestor].novas++;
      else if (r.status === "Crescimento") sum.porGestor[r.gestor].crescimento++;
      else if (r.status === "Estável") sum.porGestor[r.gestor].estavel++;
      else if (r.status === "Queda") sum.porGestor[r.gestor].queda++;
    }
    if (r.estrategista) {
      if (!sum.porEstrategista[r.estrategista]) sum.porEstrategista[r.estrategista] = emptyCross();
      sum.porEstrategista[r.estrategista].total++;
      if (nova) sum.porEstrategista[r.estrategista].novas++;
      else if (r.status === "Crescimento") sum.porEstrategista[r.estrategista].crescimento++;
      else if (r.status === "Estável") sum.porEstrategista[r.estrategista].estavel++;
      else if (r.status === "Queda") sum.porEstrategista[r.estrategista].queda++;
    }
  }
  return sum;
}

async function fetchOne(fn: string): Promise<PerformanceLoja[]> {
  try {
    const { data, error } = await supabase.functions.invoke(fn);
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    const rows = (data.rows || []) as Array<PerformanceLoja & { previsibilidade?: string }>;
    // Aceita tanto `previsibilidade` (script novo) quanto `prevClassRaw` (legado)
    return rows.map(r => ({
      ...r,
      prevClassRaw: r.prevClassRaw || r.previsibilidade || "",
    }));
  } catch (err) {
    console.error(`Erro ao buscar ${fn}:`, err);
    return [];
  }
}

export async function fetchPerformanceData(): Promise<PerformanceResult> {
  const [ifood, food99] = await Promise.all([
    fetchOne("performance-proxy"),
    fetchOne("performance-99food-proxy"),
  ]);
  const rows = [...ifood, ...food99];
  return { rows, summary: buildSummary(rows) };
}
