import { FinanceiroClient, FinanceiroSummary, parseFinanceiroSP, parseFinanceiroSSA, parseFinanceiroSummariesByRegion } from "@/data/financeiro";
import { financeiroStaticData } from "@/data/financeiroStatic";
import { supabase } from "@/integrations/supabase/client";

export interface FinanceiroResult {
  clients: FinanceiroClient[];
  summaries: { geral: FinanceiroSummary; sp: FinanceiroSummary; ssa: FinanceiroSummary };
  saldoAtual: number;
}

export async function fetchFinanceiroData(): Promise<FinanceiroResult> {
  try {
    const { data, error } = await supabase.functions.invoke("financeiro-proxy");
    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    const spRows: unknown[][] = data.sp || [];
    const ssaRows: unknown[][] = data.ssa || [];

    const spClients = parseFinanceiroSP(spRows);
    const ssaClients = parseFinanceiroSSA(ssaRows);
    const summaries = parseFinanceiroSummariesByRegion(spRows, ssaRows);

    const saldoAtual = typeof data.saldoAtual === "number" ? data.saldoAtual : 0;

    return { clients: [...spClients, ...ssaClients], summaries, saldoAtual };
  } catch (err) {
    console.error("Erro ao buscar dados financeiros:", err);
    return {
      clients: financeiroStaticData,
      summaries: { geral: { receitaMensal: 0, receitaAtiva: 0, emCancelamento: 0 }, sp: { receitaMensal: 0, receitaAtiva: 0, emCancelamento: 0 }, ssa: { receitaMensal: 0, receitaAtiva: 0, emCancelamento: 0 } },
      saldoAtual: 0,
    };
  }
}

// Keep backward compatibility
export async function fetchFinanceiroClients(): Promise<FinanceiroClient[]> {
  const result = await fetchFinanceiroData();
  return result.clients;
}
