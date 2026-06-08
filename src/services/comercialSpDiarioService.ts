import { supabase } from "@/integrations/supabase/client";

export type DiarioStatus = "FEITO" | "SEM_RESPOSTA" | "REAGENDAMENTO" | "A_FAZER";

export interface DiarioRecord {
  aba: string; // ex: "11/05/2026"
  dataAgendamento: string;
  agender: string;
  proprietario: string;
  loja: string;
  dataReuniao: string;
  horario: string;
  telefone: string;
  link: string;
  obs: string;
  statusRaw: string;
  closer: string;
  assunto: string;
  status: DiarioStatus;
  cor: string;
}

export interface ComercialSpDiarioResult {
  registros: DiarioRecord[];
  abas: string[];
}

const toStr = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString();
  return String(v);
};

const STATUS_VALIDOS: DiarioStatus[] = ["FEITO", "SEM_RESPOSTA", "REAGENDAMENTO", "A_FAZER"];

export async function fetchComercialSpDiario(): Promise<ComercialSpDiarioResult> {
  try {
    const { data, error } = await supabase.functions.invoke("comercial-sp-diario-proxy");
    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    const abasRaw: Array<{ aba: string; rows: Record<string, unknown>[] }> = data?.abas ?? [];
    const registros: DiarioRecord[] = [];
    const abas: string[] = [];

    for (const a of abasRaw) {
      abas.push(a.aba);
      for (const row of a.rows) {
        const statusFromColor = toStr(row["_status"]) as DiarioStatus;
        const status: DiarioStatus = STATUS_VALIDOS.includes(statusFromColor) ? statusFromColor : "A_FAZER";

        registros.push({
          aba: a.aba,
          dataAgendamento: toStr(row["DATA DO AGENDAMENTO__display"] || row["DATA DO AGENDAMENTO"]),
          agender: toStr(row["AGENDER"]),
          proprietario: toStr(row["PROPRIETARIO"]),
          loja: toStr(row["NOME DA LOJA"]),
          dataReuniao: toStr(row["DATA DA REUNIÃO__display"] || row["DATA DA REUNIÃO"]),
          horario: toStr(row["HORARIO__display"] || row["HORARIO"]),
          telefone: toStr(row["TELEFONE"]),
          link: toStr(row["LINK"]),
          obs: toStr(row["OBS"]),
          statusRaw: toStr(row["STATUS"]),
          closer: toStr(row["CLOSER"]),
          assunto: toStr(row["Assunto"]),
          status,
          cor: toStr(row["_color"]),
        });
      }
    }

    return { registros, abas };
  } catch (err) {
    console.error("Erro Comercial SP Diário:", err);
    return { registros: [], abas: [] };
  }
}

export const STATUS_LABELS: Record<DiarioStatus, string> = {
  FEITO: "Feito",
  SEM_RESPOSTA: "Sem resposta",
  REAGENDAMENTO: "Reagendamento",
  A_FAZER: "A fazer",
};

export const STATUS_COLORS: Record<DiarioStatus, string> = {
  FEITO: "hsl(142 70% 45%)",       // verde
  SEM_RESPOSTA: "hsl(48 95% 55%)", // amarelo
  REAGENDAMENTO: "hsl(28 60% 40%)", // marrom
  A_FAZER: "hsl(0 0% 80%)",        // branco/cinza
};
