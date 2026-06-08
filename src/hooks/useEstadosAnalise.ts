import { useMemo } from "react";
import { usePerformance } from "./usePerformance";
import { useGerenciamento } from "./useGerenciamento";
import { normalizeEmpresa } from "@/lib/utils";
import type { PerformanceLoja } from "@/services/performanceService";

export type PlataformaFilter = "AMBOS" | "iFood" | "99Food";

export interface EstadosLojaRow {
  id: string;
  loja: string;
  empresaKey: string;
  estado: string;
  nicho: string;
  gestor: string;
  plataforma: string;
  fatAtual: number;
  fatAnterior: number;
  fatUlt15: number | null;
  variacaoPct: number | null;
  /** Variação % vinda da coluna STATUS (%) da planilha (fat. inicial vs último mês fechado) */
  variacaoPctStatus: number | null;
  status: string;
  statusLoja: string;
  fidelidade: string;
  garantia: string;
  estrategista: string;
  dataEntrada: string | null;
  dataUltimaEstrategia: string | null;
  ultAtualizacao: string | null;
  observacao: string;
  tempoAberto: string;
}

export interface AggregatedRow {
  key: string;          // estado, nicho or composite
  estado?: string;
  nicho?: string;
  lojas: number;
  faturamentoAtual: number;
  faturamentoAnterior: number;
  variacaoAbs: number;
  variacaoPct: number | null;
  /** Média ponderada (por fat. atual) da variação % vinda da coluna STATUS (%) */
  variacaoPctStatus: number | null;
}

export interface EstadosAnalise {
  isLoading: boolean;
  totalLojas: number;
  lojasMapeadas: number;
  estadosCount: number;
  nichosCount: number;
  faturamentoAtual: number;
  faturamentoAnterior: number;
  variacaoGeralPct: number | null;
  rows: EstadosLojaRow[];
  porEstado: AggregatedRow[];
  porNicho: AggregatedRow[];
  porEstadoNicho: AggregatedRow[];
  topAlta: AggregatedRow[];
  topQueda: AggregatedRow[];
  hasMapping: boolean;
}

const calcVar = (atual: number, anterior: number): number | null => {
  if (!anterior || anterior === 0) return null;
  return ((atual - anterior) / anterior) * 100;
};

const aggregate = (
  rows: EstadosLojaRow[],
  keyFn: (r: EstadosLojaRow) => string,
  buildExtras: (r: EstadosLojaRow) => Partial<AggregatedRow>
): AggregatedRow[] => {
  const map = new Map<string, AggregatedRow>();
  // Acumuladores para média ponderada de variacaoPctStatus por chave
  const weightedSum = new Map<string, number>();
  const weightTotal = new Map<string, number>();

  for (const r of rows) {
    const key = keyFn(r);
    if (!map.has(key)) {
      map.set(key, {
        key,
        ...buildExtras(r),
        lojas: 0,
        faturamentoAtual: 0,
        faturamentoAnterior: 0,
        variacaoAbs: 0,
        variacaoPct: null,
        variacaoPctStatus: null,
      });
    }
    const agg = map.get(key)!;
    agg.lojas += 1;
    agg.faturamentoAtual += r.fatAtual;
    agg.faturamentoAnterior += r.fatAnterior;

    // Média ponderada de variacaoPctStatus pelo fatAtual da loja
    if (r.variacaoPctStatus !== null && Number.isFinite(r.variacaoPctStatus)) {
      const w = r.fatAtual > 0 ? r.fatAtual : 1;
      weightedSum.set(key, (weightedSum.get(key) ?? 0) + r.variacaoPctStatus * w);
      weightTotal.set(key, (weightTotal.get(key) ?? 0) + w);
    }
  }
  for (const [key, agg] of map.entries()) {
    agg.variacaoAbs = agg.faturamentoAtual - agg.faturamentoAnterior;
    agg.variacaoPct = calcVar(agg.faturamentoAtual, agg.faturamentoAnterior);
    const wt = weightTotal.get(key);
    agg.variacaoPctStatus = wt && wt > 0 ? (weightedSum.get(key) ?? 0) / wt : null;
  }
  return Array.from(map.values());
};

export function useEstadosAnalise(plataforma: PlataformaFilter = "AMBOS"): EstadosAnalise {
  const { data: perfData, isFetching: loadingPerf } = usePerformance();
  const { data: gerData, isFetching: loadingGer } = useGerenciamento();

  return useMemo(() => {
    const perfRows: PerformanceLoja[] = perfData?.rows ?? [];
    const gerLojas = gerData?.lojas ?? [];

    // Fallback: mapa empresa normalizada -> { estado, nicho } a partir do Gerenciamento
    // (usado apenas se a linha de Performance não tiver estado/nicho preenchido).
    const meta = new Map<string, { estado: string; nicho: string }>();
    for (const l of gerLojas) {
      const key = normalizeEmpresa(l.empresa);
      if (!key) continue;
      const existing = meta.get(key);
      const estado = (l.estado || "").trim();
      const nicho = (l.nicho || "").trim();
      if (!existing) {
        meta.set(key, { estado, nicho });
      } else {
        if (!existing.estado && estado) existing.estado = estado;
        if (!existing.nicho && nicho) existing.nicho = nicho;
      }
    }

    const filteredPerf = perfRows.filter((r) => {
      const sl = (r.statusLoja || "").toLowerCase();
      if (sl !== "ativa" && sl !== "em cancelamento") return false;
      if (plataforma === "AMBOS") return true;
      return r.plataforma === plataforma;
    });

    // Agrega por loja somando plataformas
    const byLoja = new Map<string, EstadosLojaRow>();
    for (const r of filteredPerf) {
      const key = normalizeEmpresa(r.loja);
      if (!key) continue;
      const fallback = meta.get(key);
      const estadoRaw = (r.estado || "").trim() || fallback?.estado || "";
      const nichoRaw = (r.nicho || "").trim() || fallback?.nicho || "";
      const estado = estadoRaw || "Não informado";
      const nicho = nichoRaw || "Não informado";
      // Estados usa FAT. INICIAL (coluna O) como referência principal e MÊS ANTERIOR (P) como comparativo
      const fatAtual = r.fatInicial ?? 0;
      const fatAnterior = r.fatMesAnterior ?? 0;
      if (!byLoja.has(key)) {
        byLoja.set(key, {
          id: r.id || "",
          loja: r.loja,
          empresaKey: key,
          estado,
          nicho,
          gestor: r.gestor || "",
          plataforma: r.plataforma,
          fatAtual: 0,
          fatAnterior: 0,
          fatUlt15: r.fatUlt15 ?? null,
          variacaoPct: null,
          variacaoPctStatus: r.variacaoPct ?? null,
          status: r.status || "",
          statusLoja: r.statusLoja || "",
          fidelidade: r.fidelidade || "",
          garantia: r.garantia || "",
          estrategista: r.estrategista || "",
          dataEntrada: r.dataEntrada ?? null,
          dataUltimaEstrategia: r.dataUltimaEstrategia ?? null,
          ultAtualizacao: r.ultAtualizacao ?? null,
          observacao: r.observacao || "",
          tempoAberto: r.tempoAberto || "",
        });
      }
      const agg = byLoja.get(key)!;
      agg.fatAtual += fatAtual;
      agg.fatAnterior += fatAnterior;
      if (!agg.id && r.id) agg.id = r.id;
      if (agg.variacaoPctStatus === null && r.variacaoPct !== null && r.variacaoPct !== undefined) {
        agg.variacaoPctStatus = r.variacaoPct;
      }
      // Preferir estado/nicho preenchido
      if (agg.estado === "Não informado" && estado !== "Não informado") agg.estado = estado;
      if (agg.nicho === "Não informado" && nicho !== "Não informado") agg.nicho = nicho;
      // marcar plataforma combinada
      if (agg.plataforma && agg.plataforma !== r.plataforma) agg.plataforma = "Ambos";
    }
    for (const v of byLoja.values()) {
      v.variacaoPct = calcVar(v.fatAtual, v.fatAnterior);
    }
    const rows = Array.from(byLoja.values());

    const porEstado = aggregate(rows, (r) => r.estado, (r) => ({ estado: r.estado }))
      .sort((a, b) => b.faturamentoAtual - a.faturamentoAtual);

    const porNicho = aggregate(rows, (r) => r.nicho, (r) => ({ nicho: r.nicho }))
      .sort((a, b) => b.faturamentoAtual - a.faturamentoAtual);

    const porEstadoNicho = aggregate(
      rows,
      (r) => `${r.estado}|${r.nicho}`,
      (r) => ({ estado: r.estado, nicho: r.nicho })
    ).sort((a, b) => b.faturamentoAtual - a.faturamentoAtual);

    // Para rankings de alta/queda — só estados informados com >= 2 lojas
    // Ranking baseado na coluna STATUS (%) (média ponderada por fat. atual)
    const candidatos = porEstado.filter(
      (s) => s.estado && s.estado !== "Não informado" && s.lojas >= 2 && s.variacaoPctStatus !== null
    );
    const topAlta = [...candidatos].sort((a, b) => (b.variacaoPctStatus! - a.variacaoPctStatus!)).slice(0, 5);
    const topQueda = [...candidatos].sort((a, b) => (a.variacaoPctStatus! - b.variacaoPctStatus!)).slice(0, 5);

    const lojasMapeadas = rows.filter((r) => r.estado !== "Não informado").length;
    const faturamentoAtual = rows.reduce((s, r) => s + r.fatAtual, 0);
    const faturamentoAnterior = rows.reduce((s, r) => s + r.fatAnterior, 0);

    return {
      isLoading: loadingPerf || loadingGer,
      totalLojas: rows.length,
      lojasMapeadas,
      estadosCount: porEstado.filter((s) => s.estado !== "Não informado").length,
      nichosCount: porNicho.filter((s) => s.nicho !== "Não informado").length,
      faturamentoAtual,
      faturamentoAnterior,
      variacaoGeralPct: calcVar(faturamentoAtual, faturamentoAnterior),
      rows,
      porEstado,
      porNicho,
      porEstadoNicho,
      topAlta,
      topQueda,
      hasMapping: lojasMapeadas > 0,
    };
  }, [perfData, gerData, plataforma, loadingPerf, loadingGer]);
}
