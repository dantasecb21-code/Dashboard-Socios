import React, { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Minus, Store, AlertTriangle, BarChart3, Table as TableIcon, Download, FileSpreadsheet, ChevronRight, Sparkles, Activity, Gauge, AlertCircle, CheckCircle2, CircleDashed } from "lucide-react";
import PerformancePdfExportModal from "./PerformancePdfExportModal";
import PerformanceExcelExportModal from "./PerformanceExcelExportModal";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import KpiCard from "./KpiCard";
import { PerformanceLoja, PerformanceSummary, PerformanceCrosstab, isLojaNova, computePrevisibilidade, PrevisibilidadeClass } from "@/services/performanceService";

interface Props {
  rows: PerformanceLoja[];
  summary?: PerformanceSummary;
  isLoading?: boolean;
}

type StatusFilter = "TODOS" | "Crescimento" | "Estável" | "Queda" | "Novas";
type ViewMode = "performance" | "previsibilidade";

interface PrevCross { saudavel: number; estavel: number; estrategia: number; critica: number; nao: number; total: number; }

const STATUS_COLORS: Record<string, string> = {
  Crescimento: "text-success",
  Estável: "text-muted-foreground",
  Queda: "text-destructive",
};

const STATUS_BG: Record<string, string> = {
  Crescimento: "bg-success/10 border-success/30",
  Estável: "bg-muted border-border",
  Queda: "bg-destructive/10 border-destructive/30",
};

const formatBRL = (n: number | null) =>
  n === null || n === undefined
    ? "—"
    : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const formatPct = (n: number | null) => {
  if (n === null || n === undefined) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(0)}%`;
};

const formatDateBR = (s: string | null | undefined) => {
  if (!s) return "—";
  const str = String(s).trim();
  // Match YYYY-MM-DD or YYYY/MM/DD (ISO-like)
  const iso = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return str;
};

const PerformanceContent = ({ rows, summary, isLoading }: Props) => {
  const [viewMode, setViewMode] = useState<ViewMode>("performance");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("TODOS");
  const [prevFilter, setPrevFilter] = useState<"TODOS" | PrevisibilidadeClass | "semDados">("TODOS");
  const [search, setSearch] = useState("");
  const [gestorFilter, setGestorFilter] = useState<string>("TODOS");
  const [estrategistaFilter, setEstrategistaFilter] = useState<string>("TODOS");
  const [variacaoSort, setVariacaoSort] = useState<"NONE" | "DESC" | "ASC">("NONE");
  const [statusLojaFilter, setStatusLojaFilter] = useState<"TODOS" | "ATIVAS" | "ATIVAS_CANCEL" | "PAUSADAS" | "EM_CANCEL">("TODOS");
  const [pdfOpen, setPdfOpen] = useState(false);
  const [excelOpen, setExcelOpen] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [fatCritFilter, setFatCritFilter] = useState(false);
  const [lojasUrgentesFilter, setLojasUrgentesFilter] = useState(false);

  const fatCritCount = useMemo(() => {
    let n = 0;
    for (const r of rows) {
      const sl = (r.statusLoja || "").toLowerCase();
      if (sl !== "ativa" && sl !== "em cancelamento") continue;
      if (r.fatMesAnterior != null && r.fatMesAnterior < 400) n++;
    }
    return n;
  }, [rows]);

  const lojasUrgentesCount = useMemo(() => {
    let n = 0;
    for (const r of rows) {
      const sl = (r.statusLoja || "").toLowerCase();
      if (sl !== "ativa" && sl !== "em cancelamento") continue;
      const fat15 = r.fatPrev15 ?? r.fatUlt15;
      const projecao = fat15 != null ? (fat15 / 15) * 30 : null;
      if (projecao != null && projecao < 400) n++;
    }
    return n;
  }, [rows]);

  const plataformaLabel = rows[0]?.plataforma || "";

  const prevByRow = useMemo(() => {
    const m = new Map<PerformanceLoja, ReturnType<typeof computePrevisibilidade>>();
    rows.forEach(r => m.set(r, computePrevisibilidade(r)));
    return m;
  }, [rows]);

  const gestorOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => r.gestor && set.add(r.gestor));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const estrategistaOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => r.estrategista && set.add(r.estrategista));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filtered = useMemo(() => {
    let r = rows;
    if (viewMode === "performance" && statusFilter !== "TODOS") {
      if (statusFilter === "Novas") r = r.filter(x => isLojaNova(x));
      else r = r.filter(x => x.status === statusFilter && !isLojaNova(x));
    }
    if (viewMode === "previsibilidade" && prevFilter !== "TODOS") {
      if (prevFilter === "semDados") {
        r = r.filter(x => {
          const sl = (x.statusLoja || "").toLowerCase();
          if (sl !== "ativa" && sl !== "em cancelamento") return false;
          const fat15 = x.fatPrev15 ?? x.fatUlt15;
          return !x.prevClassRaw && (fat15 == null || x.fatInicial == null || x.fatInicial === 0);
        });
      } else {
        r = r.filter(x => prevByRow.get(x)?.classe === prevFilter);
      }
    }
    if (viewMode === "previsibilidade" && lojasUrgentesFilter) {
      r = r.filter(x => {
        const sl = (x.statusLoja || "").toLowerCase();
        if (sl !== "ativa" && sl !== "em cancelamento") return false;
        const p = prevByRow.get(x);
        return p?.projecao != null && p.projecao < 400;
      });
    }
    if (statusLojaFilter !== "TODOS") {
      r = r.filter(x => {
        const sl = (x.statusLoja || "").toLowerCase();
        if (statusLojaFilter === "ATIVAS") return sl === "ativa";
        if (statusLojaFilter === "EM_CANCEL") return sl === "em cancelamento";
        if (statusLojaFilter === "ATIVAS_CANCEL") return sl === "ativa" || sl === "em cancelamento";
        if (statusLojaFilter === "PAUSADAS") return sl !== "ativa" && sl !== "em cancelamento";
        return true;
      });
    }
    if (viewMode === "performance" && fatCritFilter) {
      r = r.filter(x => {
        const sl = (x.statusLoja || "").toLowerCase();
        if (sl !== "ativa" && sl !== "em cancelamento") return false;
        return x.fatMesAnterior != null && x.fatMesAnterior < 400;
      });
    }
    if (gestorFilter !== "TODOS") r = r.filter(x => x.gestor === gestorFilter);
    if (estrategistaFilter !== "TODOS") r = r.filter(x => x.estrategista === estrategistaFilter);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(x =>
        x.loja.toLowerCase().includes(q) ||
        x.gestor.toLowerCase().includes(q) ||
        x.estrategista.toLowerCase().includes(q) ||
        (x.id && String(x.id).toLowerCase().includes(q))
      );
    }
    if (variacaoSort !== "NONE") {
      r = [...r].sort((a, b) => {
        const av = a.variacaoPct;
        const bv = b.variacaoPct;
        if (av === null && bv === null) return 0;
        if (av === null) return 1;
        if (bv === null) return -1;
        return variacaoSort === "DESC" ? bv - av : av - bv;
      });
    }
    return r;
  }, [rows, viewMode, statusFilter, prevFilter, prevByRow, lojasUrgentesFilter, statusLojaFilter, gestorFilter, estrategistaFilter, search, variacaoSort, fatCritFilter]);


  const localSummary = useMemo<PerformanceSummary>(() => {
    const s: PerformanceSummary = {
      total: 0,
      crescimento: 0, estavel: 0, queda: 0, novas: 0,
      ativas: 0, emCancelamento: 0,
      porPlataforma: {}, porGestor: {}, porEstrategista: {},
    };
    const addCross = (bucket: Record<string, PerformanceCrosstab>, key: string, status: string, nova: boolean) => {
      if (!key) return;
      if (!bucket[key]) bucket[key] = { crescimento: 0, estavel: 0, queda: 0, novas: 0, total: 0 };
      bucket[key].total++;
      if (nova) bucket[key].novas++;
      else if (status === "Crescimento") bucket[key].crescimento++;
      else if (status === "Estável") bucket[key].estavel++;
      else if (status === "Queda") bucket[key].queda++;
    };
    for (const r of rows) {
      const sl = (r.statusLoja || "").toLowerCase();
      if (sl === "em cancelamento") s.emCancelamento++;
      if (sl === "ativa") s.ativas++;
      // Ativas + Em cancelamento entram nas contagens
      if (sl !== "ativa" && sl !== "em cancelamento") continue;
      s.total++;
      const nova = isLojaNova(r);
      if (nova) s.novas++;
      else if (r.status === "Crescimento") s.crescimento++;
      else if (r.status === "Estável") s.estavel++;
      else if (r.status === "Queda") s.queda++;
      if (r.plataforma) s.porPlataforma[r.plataforma] = (s.porPlataforma[r.plataforma] || 0) + 1;
      addCross(s.porGestor, r.gestor, r.status, nova);
      addCross(s.porEstrategista, r.estrategista, r.status, nova);
    }
    return s;
  }, [rows]);

  // Previsibilidade summary
  const prevSummary = useMemo(() => {
    const tot: PrevCross = { saudavel: 0, estavel: 0, estrategia: 0, critica: 0, nao: 0, total: 0 };
    const porGestor: Record<string, PrevCross> = {};
    const porEstrategista: Record<string, PrevCross> = {};
    let semDados = 0;
    const bump = (b: Record<string, PrevCross>, key: string, c: PrevisibilidadeClass) => {
      if (!key) return;
      if (!b[key]) b[key] = { saudavel: 0, estavel: 0, estrategia: 0, critica: 0, nao: 0, total: 0 };
      b[key].total++;
      b[key][c]++;
    };
    for (const r of rows) {
      const sl = (r.statusLoja || "").toLowerCase();
      if (sl !== "ativa" && sl !== "em cancelamento") continue;
      const p = prevByRow.get(r);
      if (!p) continue;
      tot.total++;
      tot[p.classe]++;
      bump(porGestor, r.gestor, p.classe);
      bump(porEstrategista, r.estrategista, p.classe);
      const fat15 = r.fatPrev15 ?? r.fatUlt15;
      if (!r.prevClassRaw && (fat15 == null || r.fatInicial == null || r.fatInicial === 0)) semDados++;
    }
    return { tot, porGestor, porEstrategista, semDados };
  }, [rows, prevByRow]);

  const prevGestorEntries = useMemo(
    () => Object.entries(prevSummary.porGestor).sort((a, b) => b[1].total - a[1].total),
    [prevSummary]
  );
  const prevEstrategistaEntries = useMemo(
    () => Object.entries(prevSummary.porEstrategista).sort((a, b) => b[1].total - a[1].total),
    [prevSummary]
  );

  const gestorEntries = useMemo(
    () => Object.entries(localSummary.porGestor).sort((a, b) => b[1].total - a[1].total),
    [localSummary]
  );
  const estrategistaEntries = useMemo(
    () => Object.entries(localSummary.porEstrategista).sort((a, b) => b[1].total - a[1].total),
    [localSummary]
  );

  // Top performers
  const topGestorCrescimento = useMemo(() => {
    let best: [string, PerformanceCrosstab] | null = null;
    for (const e of gestorEntries) {
      if (!best || e[1].crescimento > best[1].crescimento) best = e;
    }
    return best;
  }, [gestorEntries]);

  const topGestorQueda = useMemo(() => {
    let worst: [string, PerformanceCrosstab] | null = null;
    for (const e of gestorEntries) {
      if (!worst || e[1].queda > worst[1].queda) worst = e;
    }
    return worst;
  }, [gestorEntries]);

  const topEstrategistaCrescimento = useMemo(() => {
    let best: [string, PerformanceCrosstab] | null = null;
    for (const e of estrategistaEntries) {
      if (!best || e[1].crescimento > best[1].crescimento) best = e;
    }
    return best;
  }, [estrategistaEntries]);

  const topEstrategistaQueda = useMemo(() => {
    let worst: [string, PerformanceCrosstab] | null = null;
    for (const e of estrategistaEntries) {
      if (!worst || e[1].queda > worst[1].queda) worst = e;
    }
    return worst;
  }, [estrategistaEntries]);

  return (
    <div className={`space-y-4 sm:space-y-6 ${isLoading ? "opacity-60" : ""}`}>
      {/* Disjuntor de modo + título */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <h2 className="font-heading font-extrabold text-lg sm:text-xl tracking-tight uppercase">
          <span className="gradient-text">{viewMode === "performance" ? "Performance" : "Previsibilidade"}</span>
          {plataformaLabel && <span className="text-foreground ml-2">{plataformaLabel}</span>}
        </h2>
        <div className="flex items-center gap-1 bg-secondary rounded-xl p-1 border border-border">
          {(["performance", "previsibilidade"] as ViewMode[]).map(m => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`px-3 sm:px-4 py-1.5 text-[10px] sm:text-[11px] font-bold tracking-wider uppercase rounded-lg transition-all ${
                viewMode === m
                  ? "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.45)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "performance" ? "Performance" : "Previsibilidade"}
            </button>
          ))}
        </div>
      </div>

      {viewMode === "performance" ? (
        <>
          {/* KPIs principais */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
            <KpiCard title="Lojas Ativas" value={localSummary.ativas + localSummary.emCancelamento} subtitle={`${localSummary.ativas} ativas + ${localSummary.emCancelamento} em cancelamento`} icon={Store} variant="info" delay={0} />
            <KpiCard title="Lojas Novas" value={localSummary.novas} subtitle={`${((localSummary.novas / Math.max(1, localSummary.total)) * 100).toFixed(0)}%`} icon={Sparkles} variant="info" delay={1} tooltip="Lojas marcadas como NOVA na planilha (ainda sem histórico suficiente para classificar)." />
            <KpiCard title="Crescimento" value={localSummary.crescimento} subtitle={`${((localSummary.crescimento / Math.max(1, localSummary.total)) * 100).toFixed(0)}%`} icon={TrendingUp} variant="success" delay={2} />
            <KpiCard title="Estável" value={localSummary.estavel} subtitle={`${((localSummary.estavel / Math.max(1, localSummary.total)) * 100).toFixed(0)}%`} icon={Minus} delay={3} tooltip="Lojas classificadas como Estável tiveram variação de até ±10% (queda ou aumento) no faturamento." />
            <KpiCard title="Queda" value={localSummary.queda} subtitle={`${((localSummary.queda / Math.max(1, localSummary.total)) * 100).toFixed(0)}%`} icon={TrendingDown} variant="destructive" delay={4} />
            <KpiCard title="Em cancelamento" value={localSummary.emCancelamento} subtitle="Risco" icon={AlertTriangle} variant="warning" delay={5} />
          </div>

          {/* Top performers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <TopCard title="Gestor +Crescimento" entry={topGestorCrescimento} field="crescimento" variant="success" />
            <TopCard title="Gestor +Queda" entry={topGestorQueda} field="queda" variant="destructive" />
            <TopCard title="Estrategista +Crescimento" entry={topEstrategistaCrescimento} field="crescimento" variant="success" />
            <TopCard title="Estrategista +Queda" entry={topEstrategistaQueda} field="queda" variant="destructive" />
          </div>

          {/* Tabelas cruzadas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <CrossTable title="Por Gestor" entries={gestorEntries} />
            <CrossTable title="Por Estrategista" entries={estrategistaEntries} />
          </div>
        </>
      ) : (
        <>
          {/* KPIs Previsibilidade */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
            <KpiCard title="Lojas analisadas" value={prevSummary.tot.saudavel + prevSummary.tot.estavel + prevSummary.tot.estrategia + prevSummary.tot.critica} subtitle={`${prevSummary.tot.total} no total`} icon={Activity} variant="info" delay={0} tooltip="Lojas Ativas ou Em cancelamento com dados de 01–15." />
            <KpiCard title="🟢 Saudável" value={prevSummary.tot.saudavel} subtitle="Projeção ≥ inicial e ≥ mês ant." icon={CheckCircle2} variant="success" delay={1} />
            <KpiCard title="🔵 Estável" value={prevSummary.tot.estavel} subtitle="Projeção próxima ao mês ant." icon={Minus} variant="info" delay={2} />
            <KpiCard title="🟠 Estratégia" value={prevSummary.tot.estrategia} subtitle="Acima do inicial, abaixo do mês ant." icon={Gauge} variant="warning" delay={3} />
            <KpiCard title="🔴 Queda crítica" value={prevSummary.tot.critica} subtitle="Classificação da planilha" icon={AlertCircle} variant="destructive" delay={4} />
            <KpiCard title="⚪ Não analisar" value={prevSummary.tot.nao} subtitle="Pausadas ou sem dados" icon={CircleDashed} delay={5} />
          </div>

          {/* Tabelas cruzadas Previsibilidade */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <PrevCrossTable title="Previsibilidade por Gestor" entries={prevGestorEntries} />
            <PrevCrossTable title="Previsibilidade por Estrategista" entries={prevEstrategistaEntries} />
          </div>
        </>
      )}


      {viewMode === "previsibilidade" && prevSummary.semDados > 0 && (
        <button
          onClick={() => setPrevFilter("semDados")}
          className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl border border-warning/40 bg-warning/10 text-warning text-xs sm:text-sm hover:bg-warning/15 transition-colors"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            {prevSummary.semDados} loja{prevSummary.semDados > 1 ? "s" : ""} analisada{prevSummary.semDados > 1 ? "s" : ""} sem dados suficientes (fat. 01–15 ou inicial ausente).
          </span>
        </button>
      )}

      {/* Filtros + Tabela de lojas */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-border flex flex-wrap items-center gap-2">
          {/* Status pills */}
          {viewMode === "performance" ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              {(["TODOS", "Crescimento", "Estável", "Queda", "Novas"] as StatusFilter[]).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`shrink-0 px-3 py-1.5 text-[10px] sm:text-[11px] font-bold tracking-wider uppercase rounded-lg transition-all whitespace-nowrap ${
                    statusFilter === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {s} {s !== "TODOS" && `(${s === "Crescimento" ? localSummary.crescimento : s === "Estável" ? localSummary.estavel : s === "Queda" ? localSummary.queda : localSummary.novas})`}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              {([
                ["TODOS", "Todos", prevSummary.tot.total],
                ["saudavel", "🟢 Saudável", prevSummary.tot.saudavel],
                ["estavel", "🔵 Estável", prevSummary.tot.estavel],
                ["estrategia", "🟠 Estratégia", prevSummary.tot.estrategia],
                ["critica", "🔴 Crítica", prevSummary.tot.critica],
                ["nao", "⚪ Não analisar", prevSummary.tot.nao],
                ["semDados", "⚠️ Sem dados", prevSummary.semDados],
              ] as const).map(([key, label, count]) => (
                <button
                  key={key}
                  onClick={() => setPrevFilter(key as typeof prevFilter)}
                  className={`shrink-0 px-3 py-1.5 text-[10px] sm:text-[11px] font-bold tracking-wider uppercase rounded-lg transition-all whitespace-nowrap ${
                    prevFilter === key
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
          )}

          {/* Chip Críticas (fat. mês anterior < R$ 400) — só em Performance */}
          {viewMode === "performance" && (
            <button
              onClick={() => setFatCritFilter(v => !v)}
              title="Lojas Ativa/Em cancelamento com faturamento do mês anterior abaixo de R$ 400"
              className={`shrink-0 px-3 py-1.5 text-[10px] sm:text-[11px] font-bold tracking-wider uppercase rounded-lg transition-all whitespace-nowrap border ${
                fatCritFilter
                  ? "bg-destructive text-destructive-foreground border-destructive"
                  : "bg-destructive/10 text-destructive border-destructive/40 hover:bg-destructive/15"
              }`}
            >
              🚨 Críticas mês ant. &lt; R$ 400 ({fatCritCount})
            </button>
          )}

          {viewMode === "previsibilidade" && (
            <button
              onClick={() => setLojasUrgentesFilter(v => !v)}
              title="Lojas Ativa/Em cancelamento com projeção mensal abaixo de R$ 400"
              className={`shrink-0 px-3 py-1.5 text-[10px] sm:text-[11px] font-bold tracking-wider uppercase rounded-lg transition-all whitespace-nowrap border ${
                lojasUrgentesFilter
                  ? "bg-destructive text-destructive-foreground border-destructive"
                  : "bg-destructive/10 text-destructive border-destructive/40 hover:bg-destructive/15"
              }`}
            >
              🚨 Lojas urgentes &lt; R$ 400 ({lojasUrgentesCount})
            </button>
          )}

          {/* Divisor visual */}
          <div className="hidden lg:block h-6 w-px bg-border mx-1" />

          {/* Busca expansível ocupa o espaço livre */}
          <div className="relative flex-1 min-w-[200px] order-last lg:order-none">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por ID, loja, gestor ou estrategista..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
          </div>

          {/* Selects compactos */}
          <select
            value={gestorFilter}
            onChange={e => setGestorFilter(e.target.value)}
            title="Filtrar por gestor"
            className="px-2.5 py-1.5 text-xs rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 max-w-[140px]"
          >
            <option value="TODOS">Gestor: todos</option>
            {gestorOptions.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select
            value={estrategistaFilter}
            onChange={e => setEstrategistaFilter(e.target.value)}
            title="Filtrar por estrategista"
            className="px-2.5 py-1.5 text-xs rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 max-w-[160px]"
          >
            <option value="TODOS">Estrategista: todos</option>
            {estrategistaOptions.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select
            value={variacaoSort}
            onChange={e => setVariacaoSort(e.target.value as "NONE" | "DESC" | "ASC")}
            title="Ordenar por variação"
            className="px-2.5 py-1.5 text-xs rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="NONE">Variação ↕</option>
            <option value="DESC">Variação ↓</option>
            <option value="ASC">Variação ↑</option>
          </select>
          <select
            value={statusLojaFilter}
            onChange={e => setStatusLojaFilter(e.target.value as typeof statusLojaFilter)}
            title="Filtrar por status da loja"
            className="px-2.5 py-1.5 text-xs rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="TODOS">Todas as lojas</option>
            <option value="ATIVAS">Apenas Ativas</option>
            <option value="ATIVAS_CANCEL">Ativas + Em cancelamento</option>
            <option value="EM_CANCEL">Em cancelamento</option>
            <option value="PAUSADAS">Pausadas</option>
          </select>

          {/* Contador de resultados */}
          <span className="text-[11px] text-muted-foreground font-medium tabular-nums px-1">
            {filtered.length} {filtered.length === 1 ? "loja" : "lojas"}
          </span>

          <button
            onClick={() => setExcelOpen(true)}
            className="ml-auto px-3 py-1.5 text-xs font-semibold rounded-lg bg-success text-success-foreground hover:bg-success/90 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0"
            title="Configurar e baixar Excel personalizado"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Excel
          </button>
          <button
            onClick={() => setPdfOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0"
            title="Configurar e baixar PDF personalizado"
          >
            <Download className="w-3.5 h-3.5" />
            PDF
          </button>

        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="w-8 px-2 py-2.5"></th>
                <th className="text-left px-3 py-2.5 font-semibold">Loja</th>
                <th className="text-left px-3 py-2.5 font-semibold">Gestor</th>
                <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Status Loja</th>
                {viewMode === "previsibilidade" && (
                  <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Previsibilidade</th>
                )}
                <th className="text-right px-3 py-2.5 font-semibold">Variação</th>
                <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">{viewMode === "previsibilidade" ? "Projeção mês" : "Fat. Mês Ant."}</th>
                {viewMode === "previsibilidade" && (
                  <>
                    <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">Fat. 01–15</th>
                    <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">Mês Ant.</th>
                  </>
                )}
                <th className="text-right px-3 py-2.5 font-semibold">Inicial</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={viewMode === "previsibilidade" ? 10 : 7} className="px-3 py-8 text-center text-muted-foreground">Nenhuma loja encontrada</td></tr>
              )}
              {filtered.map((r, i) => {
                const rowKey = `${r.id}-${i}`;
                const isOpen = expandedRow === rowKey;
                return (
                  <React.Fragment key={rowKey}>
                    <tr
                      onClick={() => setExpandedRow(isOpen ? null : rowKey)}
                      className="border-t border-border hover:bg-muted/30 cursor-pointer"
                    >
                      <td className="px-2 py-2.5 text-muted-foreground">
                        <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                      </td>
                      <td className="px-3 py-2.5 font-medium text-foreground">{r.loja}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{r.gestor || "—"}</td>
                      <td className="px-3 py-2.5">
                        {(() => {
                          const sl = (r.statusLoja || "").toLowerCase();
                          const cls =
                            sl === "ativa" ? "bg-success/15 text-success" :
                            sl === "em cancelamento" ? "bg-destructive/15 text-destructive" :
                            sl ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground";
                          return (
                            <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${cls}`}>
                              {r.statusLoja || "—"}
                            </span>
                          );
                        })()}
                      </td>
                      {viewMode === "previsibilidade" && (
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {(() => {
                            const p = prevByRow.get(r);
                            if (!p) return <span className="text-muted-foreground text-[11px]">—</span>;
                            const cls =
                              p.classe === "saudavel" ? "bg-success/15 text-success border-success/30" :
                              p.classe === "estavel" ? "bg-info/15 text-info border-info/30" :
                              p.classe === "estrategia" ? "bg-warning/15 text-warning border-warning/30" :
                              p.classe === "critica" ? "bg-destructive/15 text-destructive border-destructive/30" :
                              "bg-muted text-muted-foreground border-border";
                            return (
                              <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold border ${cls}`}>
                                {p.emoji} {p.label}
                              </span>
                            );
                          })()}
                        </td>
                      )}
                      <td className={`px-3 py-2.5 text-right font-semibold ${r.variacaoPct !== null && r.variacaoPct > 0 ? "text-success" : r.variacaoPct !== null && r.variacaoPct < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                        {formatPct(r.variacaoPct)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-foreground font-semibold">
                        {(() => {
                          if (viewMode === "previsibilidade") {
                            const p = prevByRow.get(r);
                            return formatBRL(p?.projecao ?? null);
                          }
                          return formatBRL(r.fatMesAnterior);
                        })()}
                      </td>
                      {viewMode === "previsibilidade" && (
                        <>
                          <td className="px-3 py-2.5 text-right text-muted-foreground">{formatBRL(r.fatPrev15 ?? r.fatUlt15 ?? null)}</td>
                          <td className="px-3 py-2.5 text-right text-muted-foreground">{formatBRL(r.fatMesAnterior)}</td>
                        </>
                      )}
                      <td className="px-3 py-2.5 text-right text-muted-foreground">{formatBRL(r.fatInicial)}</td>
                    </tr>
                    {isOpen && (
                      <tr key={`${rowKey}-detail`} className="bg-muted/20 border-t border-border">
                        <td colSpan={viewMode === "previsibilidade" ? 10 : 7} className="px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3 text-xs">
                            <DetailField label="ID" value={r.id} />
                            <DetailField label="Loja" value={r.loja} />
                            <DetailField label="Plataforma" value={r.plataforma} />
                            <DetailField label="Gestor" value={r.gestor} />
                            <DetailField label="Gestor (Aba)" value={r.gestorAba} />
                            <DetailField label="Estrategista" value={r.estrategista} />
                            <DetailField label="Status Loja" value={r.statusLoja} />
                            <DetailField label="Status" value={r.status} />
                            <DetailField label="Status (Raw)" value={r.statusRaw} />
                            <DetailField label="Fidelidade" value={r.fidelidade} />
                            <DetailField label="Garantia" value={r.garantia} />
                            <DetailField label="Garantia Atingida" value={r.garantiaAtingida || "—"} />
                            <DetailField label="Data Atingida" value={formatDateBR(r.dataQuandoAtingiu || null)} />
                            <DetailField label="Estado" value={r.estado} />
                            <DetailField label="Nicho" value={r.nicho} />
                            <DetailField label="LTV" value={r.ltv} />
                            <DetailField label="Tempo Aberto" value={r.tempoAberto} />
                            <DetailField label="Data Entrada" value={formatDateBR(r.dataEntrada)} />
                            <DetailField label="Data Última Estratégia" value={formatDateBR(r.dataUltimaEstrategia)} />
                            <DetailField label="Data Otimização" value={formatDateBR(r.dataOtimizacao)} />
                            <DetailField label="Data Entrega" value={formatDateBR(r.dataEntrega)} />
                            <DetailField label="Última Atualização" value={formatDateBR(r.ultAtualizacao)} />
                            <DetailField label="Fat. Inicial" value={formatBRL(r.fatInicial)} />
                            <DetailField label="Fat. Mês Anterior" value={formatBRL(r.fatMesAnterior)} />
                            <DetailField label="Fat. Atual" value={formatBRL(r.fatAtual)} />
                            <DetailField label="Fat. Últ. 15 dias" value={formatBRL(r.fatUlt15)} />
                            <DetailField label="Fat. Previsib. (01–15)" value={formatBRL(r.fatPrev15 ?? null)} />
                            {(() => {
                              const p = prevByRow.get(r);
                              if (!p) return null;
                              return (
                                <>
                                  <DetailField label="Projeção Mensal" value={formatBRL(p.projecao)} />
                                  <DetailField label="Previsibilidade" value={`${p.emoji} ${p.label}${p.pct === null ? "" : ` (${(p.pct * 100).toFixed(0)}%)`}`} />
                                </>
                              );
                            })()}
                            <DetailField label="Variação" value={formatPct(r.variacaoPct)} />
                          </div>
                          {(r.observacao || r.historico) && (
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                              {r.observacao && (
                                <div>
                                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Observação</p>
                                  <p className="text-xs text-foreground whitespace-pre-wrap">{r.observacao}</p>
                                </div>
                              )}
                              {r.historico && (
                                <div>
                                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Histórico</p>
                                  <p className="text-xs text-foreground whitespace-pre-wrap">{r.historico}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <PerformancePdfExportModal open={pdfOpen} onClose={() => setPdfOpen(false)} rows={rows} />
      <PerformanceExcelExportModal open={excelOpen} onClose={() => setExcelOpen(false)} rows={rows} />
    </div>
  );
};

interface DetailFieldProps {
  label: string;
  value: string | number | null | undefined;
}

const DetailField = ({ label, value }: DetailFieldProps) => {
  const display = value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="text-xs text-foreground font-medium mt-0.5 break-words">{display}</p>
    </div>
  );
};

interface TopCardProps {
  title: string;
  entry: [string, PerformanceCrosstab] | null;
  field: "crescimento" | "queda";
  variant: "success" | "destructive";
}

const TopCard = ({ title, entry, field, variant }: TopCardProps) => {
  const colorClass = variant === "success" ? "text-success" : "text-destructive";
  const bgClass = variant === "success" ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20";
  return (
    <div className={`rounded-xl border ${bgClass} p-3`}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{title}</p>
      {entry ? (
        <>
          <p className="text-sm font-bold text-foreground mt-1 truncate">{entry[0]}</p>
          <p className={`text-2xl font-bold ${colorClass} mt-0.5`}>{entry[1][field]}</p>
          <p className="text-[10px] text-muted-foreground">de {entry[1].total} lojas</p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground mt-2">—</p>
      )}
    </div>
  );
};

interface CrossTableProps {
  title: string;
  entries: [string, PerformanceCrosstab][];
}

const CrossTable = ({ title, entries }: CrossTableProps) => {
  const [view, setView] = useState<"table" | "chart">("table");

  // Ordena por crescimento decrescente (mais crescimento primeiro)
  const sorted = useMemo(
    () => [...entries].sort((a, b) => b[1].crescimento - a[1].crescimento),
    [entries]
  );

  const chartData = useMemo(
    () => sorted.map(([name, c]) => ({
      name,
      Novas: c.novas,
      Crescimento: c.crescimento,
      Estável: c.estavel,
      Queda: c.queda,
    })),
    [sorted]
  );

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5">
          <button
            onClick={() => setView("table")}
            className={`p-1.5 rounded-md transition-all ${view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            title="Tabela"
          >
            <TableIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setView("chart")}
            className={`p-1.5 rounded-md transition-all ${view === "chart" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            title="Gráfico"
          >
            <BarChart3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {view === "table" ? (
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Nome</th>
                <th className="text-right px-2 py-2 font-semibold text-info">✦ Novas</th>
                <th className="text-right px-2 py-2 font-semibold text-success">▲ Cresc</th>
                <th className="text-right px-2 py-2 font-semibold">● Estável</th>
                <th className="text-right px-2 py-2 font-semibold text-destructive">▼ Queda</th>
                <th className="text-right px-3 py-2 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Sem dados</td></tr>
              )}
              {sorted.map(([name, c]) => (
                <tr key={name} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium text-foreground">{name}</td>
                  <td className="px-2 py-2 text-right text-info font-semibold">{c.novas}</td>
                  <td className="px-2 py-2 text-right text-success font-semibold">{c.crescimento}</td>
                  <td className="px-2 py-2 text-right text-muted-foreground">{c.estavel}</td>
                  <td className="px-2 py-2 text-right text-destructive font-semibold">{c.queda}</td>
                  <td className="px-3 py-2 text-right font-bold text-foreground">{c.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-3" style={{ height: 380 }}>
          {chartData.length === 0 ? (
            <p className="text-center text-muted-foreground text-xs py-8">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 16, right: 16, bottom: 90, left: 0 }} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  interval={0}
                  height={90}
                  tick={(props: any) => {
                    const { x, y, payload } = props;
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text
                          dy={4}
                          textAnchor="end"
                          transform="rotate(-35)"
                          fill="hsl(var(--muted-foreground))"
                          fontSize={10}
                        >
                          {payload.value}
                        </text>
                      </g>
                    );
                  }}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Novas" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Crescimento" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Estável" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Queda" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
};

interface PrevCrossTableProps {
  title: string;
  entries: [string, PrevCross][];
}

const PrevCrossTable = ({ title, entries }: PrevCrossTableProps) => {
  const sorted = useMemo(
    () => [...entries].sort((a, b) => b[1].critica - a[1].critica || b[1].total - a[1].total),
    [entries]
  );
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
      </div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 text-muted-foreground sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 font-semibold">Nome</th>
              <th className="text-right px-2 py-2 font-semibold text-success">🟢 Saudável</th>
              <th className="text-right px-2 py-2 font-semibold text-info">🔵 Estável</th>
              <th className="text-right px-2 py-2 font-semibold text-warning">🟠 Estratégia</th>
              <th className="text-right px-2 py-2 font-semibold text-destructive">🔴 Crítica</th>
              <th className="text-right px-2 py-2 font-semibold">⚪ Não anal.</th>
              <th className="text-right px-3 py-2 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Sem dados</td></tr>
            )}
            {sorted.map(([name, c]) => (
              <tr key={name} className="border-t border-border hover:bg-muted/30">
                <td className="px-3 py-2 font-medium text-foreground">{name}</td>
                <td className="px-2 py-2 text-right text-success font-semibold">{c.saudavel}</td>
                <td className="px-2 py-2 text-right text-info font-semibold">{c.estavel}</td>
                <td className="px-2 py-2 text-right text-warning font-semibold">{c.estrategia}</td>
                <td className="px-2 py-2 text-right text-destructive font-semibold">{c.critica}</td>
                <td className="px-2 py-2 text-right text-muted-foreground">{c.nao}</td>
                <td className="px-3 py-2 text-right font-bold text-foreground">{c.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PerformanceContent;
