import { supabase } from "@/integrations/supabase/client";

export type AgendamentoStatus =
  | "reuniao_feita"
  | "cancelado"
  | "em_atendimento_closer"
  | "a_fazer"
  | "venda_feita";

export interface AgendamentoRecord {
  id: string;
  dataAgendamento: string;
  dataReuniao: string;
  horario: string;
  agender: string;
  closer: string;
  proprietario: string;
  nomeLoja: string;
  telefone: string;
  status: AgendamentoStatus;
  produto: string;
  origem: string;
}

export interface VendaRecord {
  id: string;
  dataVenda: string;
  empresa: string;
  cliente: string;
  produto: string;
  closer: string;
  mesReferencia: string;
  formaPagamento: string;
  valorTotal: number;
  resultado: string;
  cancelada: boolean;
}

export interface ResumoDiarioRecord {
  data: string;
  agendamentos: number;
  auditadas: number;
  feitas: number;
  emAtendimento: number;
  aguardandoReagendamento: number;
  reagendadas: number;
  canceladas: number;
  aFazer: number;
  vendas: number;
  receita: number;
}

export interface PerformanceCloserRecord {
  closer: string;
  reunioes: number;
  vendas: number;
  receita: number;
  ticketMedio: number;
}

export interface ComercialSalvadorResult {
  registros: AgendamentoRecord[];
  vendasTab: VendaRecord[];
  resumoDiarioTab: ResumoDiarioRecord[];
  performanceTab: PerformanceCloserRecord[];
}

const toStr = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  return String(v).trim();
};

const toNum = (v: unknown): number => {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[R$\s.]/g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

const toBool = (v: unknown): boolean => {
  const s = toStr(v).toLowerCase();
  return s === "sim" || s === "true" || s === "1" || s === "yes";
};

const normalizeStatus = (raw: string): AgendamentoStatus => {
  const s = raw.toLowerCase().replace(/\s/g, "_");
  const valid: AgendamentoStatus[] = ["reuniao_feita", "cancelado", "em_atendimento_closer", "a_fazer", "venda_feita"];
  return valid.includes(s as AgendamentoStatus) ? (s as AgendamentoStatus) : "a_fazer";
};

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

const findTab = (
  abas: Record<string, Record<string, unknown>[]>,
  names: string[]
): Record<string, unknown>[] | undefined => {
  // Exact match first
  for (const name of names) {
    if (abas[name] !== undefined) return abas[name];
  }
  // Case-insensitive + accent-insensitive fallback
  const normNames = names.map(norm);
  for (const key of Object.keys(abas)) {
    if (normNames.includes(norm(key))) return abas[key];
  }
  // Partial match: any key that contains one of the names
  for (const key of Object.keys(abas)) {
    const nk = norm(key);
    if (normNames.some(n => nk.includes(n) || n.includes(nk))) return abas[key];
  }
  return undefined;
};

function parseVendas(rows: Record<string, unknown>[]): VendaRecord[] {
  return rows
    .filter(r => toStr(r["closer"]) || toStr(r["empresa"]) || toStr(r["produto"]))
    .map((r, i) => ({
      id: toStr(r["id"] ?? r["ID"]) || String(i + 1),
      dataVenda: toStr(r["data_venda"]),
      empresa: toStr(r["empresa"]),
      cliente: toStr(r["cliente"]),
      produto: toStr(r["produto"]),
      closer: toStr(r["closer"]),
      mesReferencia: toStr(r["mes_referencia"]),
      formaPagamento: toStr(r["forma_pagamento"]),
      valorTotal: toNum(r["valor_total"]),
      resultado: toStr(r["resultado"]),
      cancelada: toBool(r["cancelada"]),
    }));
}

function parseResumoDiario(rows: Record<string, unknown>[]): ResumoDiarioRecord[] {
  return rows
    .filter(r => toStr(r["data"]))
    .map(r => ({
      data: toStr(r["data"]),
      agendamentos: toNum(r["agendamentos"]),
      auditadas: toNum(r["auditadas"]),
      feitas: toNum(r["feitas"]),
      emAtendimento: toNum(r["em_atendimento"]),
      aguardandoReagendamento: toNum(r["aguardando_reagendamento"]),
      reagendadas: toNum(r["reagendadas"]),
      canceladas: toNum(r["canceladas"]),
      aFazer: toNum(r["a_fazer"]),
      vendas: toNum(r["vendas"]),
      receita: toNum(r["receita"]),
    }));
}

function parsePerformance(rows: Record<string, unknown>[]): PerformanceCloserRecord[] {
  return rows
    .filter(r => toStr(r["closer"]))
    .map(r => ({
      closer: toStr(r["closer"]),
      reunioes: toNum(r["reunioes"]),
      vendas: toNum(r["vendas"]),
      receita: toNum(r["receita"]),
      ticketMedio: toNum(r["ticket_medio"]),
    }));
}

export async function fetchComercialSalvador(): Promise<ComercialSalvadorResult> {
  const empty: ComercialSalvadorResult = {
    registros: [], vendasTab: [], resumoDiarioTab: [], performanceTab: [],
  };
  try {
    const { data, error } = await supabase.functions.invoke("comercial-salvador-proxy");
    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    const abas: Record<string, Record<string, unknown>[]> = data?.abas ?? {};
    const agendasRaw = findTab(abas, ["Agendamentos", "Agendamento", "agendamentos", "agendamento"]);
    const rows: Record<string, unknown>[] = agendasRaw ?? data?.rows ?? [];

    const registros: AgendamentoRecord[] = rows.map((row) => ({
      id: toStr(row["id"] ?? row["ID"]),
      dataAgendamento: toStr(row["data_agendamento"] ?? row["Data Agendamento"] ?? row["DATA AGENDAMENTO"]),
      dataReuniao: toStr(row["data_reuniao"] ?? row["Data Reunião"] ?? row["DATA REUNIÃO"]),
      horario: toStr(row["horario"] ?? row["Horário"] ?? row["HORARIO"]),
      agender: toStr(row["agender"] ?? row["Agendador"] ?? row["AGENDER"]),
      closer: toStr(row["closer"] ?? row["Closer"] ?? row["CLOSER"]),
      proprietario: toStr(row["proprietario"] ?? row["Proprietário"] ?? row["PROPRIETARIO"]),
      nomeLoja: toStr(row["nome_loja"] ?? row["Nome Loja"] ?? row["NOME LOJA"]),
      telefone: toStr(row["telefone"] ?? row["Telefone"] ?? row["TELEFONE"]),
      status: normalizeStatus(toStr(row["status"] ?? row["Status"] ?? row["STATUS"])),
      produto: toStr(row["produto"] ?? row["Produto"] ?? row["PRODUTO"]),
      origem: toStr(row["origem"] ?? row["Origem"] ?? row["ORIGEM"]),
    }));

    const vendasRaw = findTab(abas, ["Vendas", "vendas", "VENDAS", "Venda", "venda"]);
    const resumoRaw = findTab(abas, ["Resumo Diário", "Resumo Diario", "RESUMO DIÁRIO", "RESUMO DIARIO", "Resumo Diario", "Resumo"]);
    const perfRaw = findTab(abas, ["Performance Closer", "Performance", "PERFORMANCE", "Perf Closer", "perf closer"]);

    if (Object.keys(abas).length) {
      const found = { vendas: !!vendasRaw, resumo: !!resumoRaw, perf: !!perfRaw };
      if (!found.vendas || !found.resumo || !found.perf) {
        console.warn("Salvador: abas disponíveis:", Object.keys(abas), "| encontradas:", found);
      }
    }

    return {
      registros,
      vendasTab: vendasRaw ? parseVendas(vendasRaw) : [],
      resumoDiarioTab: resumoRaw ? parseResumoDiario(resumoRaw) : [],
      performanceTab: perfRaw ? parsePerformance(perfRaw) : [],
    };
  } catch (err) {
    console.error("Erro Comercial Salvador:", err);
    return empty;
  }
}

export const STATUS_LABELS: Record<AgendamentoStatus, string> = {
  reuniao_feita: "Reunião Feita",
  cancelado: "Cancelado",
  em_atendimento_closer: "Em atend. closer",
  a_fazer: "A fazer",
  venda_feita: "Venda Feita",
};

export const STATUS_COLORS: Record<AgendamentoStatus, string> = {
  reuniao_feita: "hsl(142 70% 45%)",
  venda_feita: "hsl(160 70% 40%)",
  em_atendimento_closer: "hsl(48 95% 55%)",
  a_fazer: "hsl(210 70% 55%)",
  cancelado: "hsl(0 65% 55%)",
};
