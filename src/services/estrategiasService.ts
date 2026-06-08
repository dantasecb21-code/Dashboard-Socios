export interface Estrategia {
  id: string;
  loja: string;
  plataforma: string;
  tipoEstrategia: string;
  gestorEstrategico: string;
  gestorOperacional: string;
  statusOperacional: string;
  statusPrazo: string;
  dataCriacaoLoja: string | null;
  dataCriacao: string | null;
  dataInicio: string | null;
  dataEntregaPrevista: string | null;
  dataConclusao: string | null;
  tempoExecucao: string;
  observacao: string;
}

export interface EstrategiasSummary {
  total: number;
  porPlataforma: Record<string, number>;
  emAndamento: number;
  aguardando: number;
  aprovadas: number;
  concluidas: number;
  canceladas: number;
  atrasadas: number;
  noPrazo: number;
}

export interface EstrategiasResult {
  estrategias: Estrategia[];
  summary: EstrategiasSummary;
}

import { supabase } from "@/integrations/supabase/client";

const emptySummary: EstrategiasSummary = {
  total: 0,
  porPlataforma: {},
  emAndamento: 0,
  aguardando: 0,
  aprovadas: 0,
  concluidas: 0,
  canceladas: 0,
  atrasadas: 0,
  noPrazo: 0,
};

export async function fetchEstrategiasData(): Promise<EstrategiasResult> {
  try {
    const { data, error } = await supabase.functions.invoke("estrategias-proxy");
    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    const rows: Record<string, unknown>[] = data.rows || [];

    // Use summary from Apps Script if available, otherwise compute from rows
    const rawSummary = data.summary;
    
    // Gestores desligados — remover do dataset
    const GESTORES_DESLIGADOS = ["bruno albert", "talita"];
    const isDesligado = (nome: string) => {
      const n = nome.toLowerCase().trim();
      return GESTORES_DESLIGADOS.some((d) => n.includes(d));
    };

    const estrategias: Estrategia[] = rows
      .filter((r) => r.storeName && String(r.storeName).trim() !== "")
      .filter((r) => !isDesligado(String(r.operationalManager || "")) && !isDesligado(String(r.managerName || "")))
      .map((r) => ({
        id: String(r.id || ""),
        loja: String(r.storeName || ""),
        plataforma: normalizePlataforma(String(r.platform || "")),
        tipoEstrategia: String(r.strategyType || ""),
        gestorEstrategico: String(r.managerName || ""),
        gestorOperacional: String(r.operationalManager || ""),
        statusOperacional: normalizeStatus(String(r.statusOperacional || "")),
        statusPrazo: normalizeStatusPrazo(String(r.statusPrazo || "")),
        dataCriacaoLoja: parseDate(r.storeCreatedAt),
        dataCriacao: parseDate(r.createdAt),
        dataInicio: parseDate(r.startedAt),
        dataEntregaPrevista: parseDate(r.deadline),
        dataConclusao: parseDate(r.completedAt),
        tempoExecucao: String(r.executionTime || ""),
        observacao: String(r.observation || ""),
      }));

    // Sempre recalcular summary localmente para refletir filtros (ex: gestores desligados)
    const summary: EstrategiasSummary = computeSummary(estrategias);

    return { estrategias, summary };
  } catch (err) {
    console.error("Erro ao buscar dados de estratégias:", err);
    return { estrategias: [], summary: emptySummary };
  }
}

/** Fallback: compute summary client-side if Apps Script doesn't return it */
function computeSummary(estrategias: Estrategia[]): EstrategiasSummary {
  const porPlataforma: Record<string, number> = {};
  let emAndamento = 0, aguardando = 0, aprovadas = 0, concluidas = 0, canceladas = 0, atrasadas = 0, noPrazo = 0;

  for (const e of estrategias) {
    if (e.plataforma) {
      porPlataforma[e.plataforma] = (porPlataforma[e.plataforma] || 0) + 1;
    }
    switch (e.statusOperacional) {
      case "Em andamento": emAndamento++; break;
      case "Aguardando aprovação": aguardando++; break;
      case "Aprovada": aprovadas++; break;
      case "Concluída": concluidas++; break;
      case "Cancelada": canceladas++; break;
    }
    if (e.statusPrazo === "Atrasada") atrasadas++;
    else if (e.statusPrazo === "No prazo") noPrazo++;
  }

  return { total: estrategias.length, porPlataforma, emAndamento, aguardando, aprovadas, concluidas, canceladas, atrasadas, noPrazo };
}

function normalizePlataforma(p: string): string {
  const up = p.toUpperCase().trim();
  if (up.includes("99")) return "99Food";
  if (up.includes("IFOOD")) return "iFood";
  return p.trim();
}

function normalizeStatus(s: string): string {
  const up = s.toUpperCase().trim();
  if (up.includes("ANDAMENTO")) return "Em andamento";
  if (up.includes("APROVAD")) return "Aprovada";
  if (up.includes("AGUARDANDO")) return "Aguardando aprovação";
  if (up.includes("CONCLU")) return "Concluída";
  if (up.includes("CANCEL")) return "Cancelada";
  return s.trim() || "Pendente";
}

function normalizeStatusPrazo(s: string): string {
  const up = s.toUpperCase().trim();
  if (up.includes("ATRAS")) return "Atrasada";
  if (up.includes("PRAZO")) return "No prazo";
  if (up.includes("VENCEN")) return "Vencendo";
  return s.trim();
}

function parseDate(v: unknown): string | null {
  if (!v) return null;
  const s = String(v);
  if (!s || s === "null" || s === "undefined") return null;
  
  const brMatch = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    const d = new Date(`${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}
