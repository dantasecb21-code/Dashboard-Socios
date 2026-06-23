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

export interface TabRecord {
  [key: string]: string;
}

export interface ComercialSalvadorResult {
  registros: AgendamentoRecord[];
  vendasTab?: TabRecord[];
  resumoDiarioTab?: TabRecord[];
  performanceTab?: TabRecord[];
}

const toStr = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  return String(v).trim();
};

const normalizeStatus = (raw: string): AgendamentoStatus => {
  const s = raw.toLowerCase().replace(/\s/g, "_");
  const valid: AgendamentoStatus[] = ["reuniao_feita", "cancelado", "em_atendimento_closer", "a_fazer", "venda_feita"];
  return valid.includes(s as AgendamentoStatus) ? (s as AgendamentoStatus) : "a_fazer";
};

const findTab = (
  abas: Record<string, Record<string, unknown>[]>,
  names: string[]
): Record<string, unknown>[] | undefined => {
  for (const name of names) {
    if (abas[name]) return abas[name];
  }
  return undefined;
};

const toTabRecords = (rows: Record<string, unknown>[]): TabRecord[] =>
  rows.map(r =>
    Object.fromEntries(Object.entries(r).map(([k, v]) => [k, toStr(v)]))
  );

export async function fetchComercialSalvador(): Promise<ComercialSalvadorResult> {
  try {
    const { data, error } = await supabase.functions.invoke("comercial-salvador-proxy");
    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    const abas: Record<string, Record<string, unknown>[]> = data?.abas ?? {};
    const rows: Record<string, unknown>[] =
      abas["Agendamentos"] ?? data?.rows ?? [];

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

    const vendasRaw = findTab(abas, ["Vendas", "vendas", "VENDAS", "Venda", "VENDA"]);
    const resumoRaw = findTab(abas, ["Resumo Diário", "Resumo Diario", "RESUMO DIÁRIO", "RESUMO DIARIO", "Resumo"]);
    const perfRaw = findTab(abas, ["Performance Closer", "Performance", "PERFORMANCE", "Perf Closer"]);

    return {
      registros,
      vendasTab: vendasRaw ? toTabRecords(vendasRaw) : undefined,
      resumoDiarioTab: resumoRaw ? toTabRecords(resumoRaw) : undefined,
      performanceTab: perfRaw ? toTabRecords(perfRaw) : undefined,
    };
  } catch (err) {
    console.error("Erro Comercial Salvador:", err);
    return { registros: [] };
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
