import { useMemo, useState } from "react";
import { X, Download, FileSpreadsheet } from "lucide-react";
import { PerformanceLoja } from "@/services/performanceService";
import { exportToExcel, ExcelColumn } from "@/lib/excelExport";

type StatusFilter = "TODOS" | "Crescimento" | "Estável" | "Queda";
type StatusLojaFilter = "TODOS" | "ATIVAS" | "ATIVAS_CANCEL" | "EM_CANCEL" | "PAUSADAS";
type SortOrder = "NONE" | "DESC" | "ASC";
type PeriodoEntrada = "TODOS" | "1M" | "3M" | "6M" | "12M" | "CUSTOM";

const PERIODO_LABELS: Record<PeriodoEntrada, string> = {
  TODOS: "Qualquer período",
  "1M": "Último mês",
  "3M": "Últimos 3 meses",
  "6M": "Últimos 6 meses",
  "12M": "Últimos 12 meses",
  CUSTOM: "Período personalizado",
};

const STATUS_LOJA_LABELS: Record<StatusLojaFilter, string> = {
  TODOS: "Todas as lojas",
  ATIVAS: "Apenas Ativas",
  ATIVAS_CANCEL: "Ativas + Em cancelamento",
  EM_CANCEL: "Apenas Em cancelamento",
  PAUSADAS: "Apenas Pausadas",
};

const ALL_COLUMNS = [
  { key: "id", label: "ID" },
  { key: "loja", label: "Loja" },
  { key: "gestor", label: "Gestor" },
  { key: "estrategista", label: "Estrategista" },
  { key: "plataforma", label: "Plataforma" },
  { key: "statusLoja", label: "Status Loja" },
  { key: "status", label: "Status" },
  { key: "dataEntrada", label: "Data Entrada" },
  { key: "ltv", label: "LTV" },
  { key: "variacao", label: "Variação %" },
  { key: "fatAtual", label: "Fat. Atual" },
  { key: "fatMesAnterior", label: "Fat. Mês Ant." },
  { key: "fatInicial", label: "Fat. Inicial" },
] as const;

const DEFAULT_COLS = ["id", "loja", "gestor", "estrategista", "statusLoja", "status", "variacao", "fatAtual", "fatMesAnterior"];

const parseEntryDate = (s: string | null | undefined): Date | null => {
  if (!s) return null;
  const str = String(s).trim();
  if (!str) return null;
  const iso = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return isNaN(d.getTime()) ? null : d;
  }
  const br = str.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
  if (br) {
    const d = new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
    return isNaN(d.getTime()) ? null : d;
  }
  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : fallback;
};

const formatDateBR = (s: string | null | undefined) => {
  if (!s) return "";
  const str = String(s).trim();
  const iso = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return str;
};

interface Props {
  open: boolean;
  onClose: () => void;
  rows: PerformanceLoja[];
}

const PerformanceExcelExportModal = ({ open, onClose, rows }: Props) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("TODOS");
  const [statusLojaFilter, setStatusLojaFilter] = useState<StatusLojaFilter>("ATIVAS_CANCEL");
  const [gestorFilter, setGestorFilter] = useState<string>("TODOS");
  const [estrategistaFilter, setEstrategistaFilter] = useState<string>("TODOS");
  const [variacaoSort, setVariacaoSort] = useState<SortOrder>("NONE");
  const [topN, setTopN] = useState<string>("");
  const [selectedCols, setSelectedCols] = useState<string[]>(DEFAULT_COLS);
  const [periodoEntrada, setPeriodoEntrada] = useState<PeriodoEntrada>("TODOS");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [fatMinPreset, setFatMinPreset] = useState<string>("0");
  const [fatMinCustom, setFatMinCustom] = useState<string>("");

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
    if (statusFilter !== "TODOS") r = r.filter(x => x.status === statusFilter);
    r = r.filter(x => {
      const sl = (x.statusLoja || "").toLowerCase();
      if (statusLojaFilter === "TODOS") return true;
      if (statusLojaFilter === "ATIVAS") return sl === "ativa";
      if (statusLojaFilter === "EM_CANCEL") return sl === "em cancelamento";
      if (statusLojaFilter === "ATIVAS_CANCEL") return sl === "ativa" || sl === "em cancelamento";
      if (statusLojaFilter === "PAUSADAS") return sl !== "ativa" && sl !== "em cancelamento";
      return true;
    });
    if (gestorFilter !== "TODOS") r = r.filter(x => x.gestor === gestorFilter);
    if (estrategistaFilter !== "TODOS") r = r.filter(x => x.estrategista === estrategistaFilter);

    if (periodoEntrada !== "TODOS") {
      const now = new Date();
      let from: Date | null = null;
      let to: Date | null = null;
      if (periodoEntrada === "CUSTOM") {
        from = customFrom ? new Date(customFrom + "T00:00:00") : null;
        to = customTo ? new Date(customTo + "T23:59:59") : null;
      } else {
        const monthsMap: Record<string, number> = { "1M": 1, "3M": 3, "6M": 6, "12M": 12 };
        const m = monthsMap[periodoEntrada];
        from = new Date(now.getFullYear(), now.getMonth() - m, now.getDate());
        to = now;
      }
      r = r.filter(x => {
        const d = parseEntryDate(x.dataEntrada);
        if (!d) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    }

    const fatMinValue = (() => {
      const custom = parseFloat(fatMinCustom.replace(/\./g, "").replace(",", "."));
      if (!isNaN(custom) && custom > 0) return custom;
      const preset = parseFloat(fatMinPreset);
      return isNaN(preset) ? 0 : preset;
    })();
    if (fatMinValue > 0) r = r.filter(x => (x.fatAtual ?? 0) >= fatMinValue);

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
    const n = parseInt(topN, 10);
    if (!isNaN(n) && n > 0) r = r.slice(0, n);
    return r;
  }, [rows, statusFilter, statusLojaFilter, gestorFilter, estrategistaFilter, variacaoSort, topN, periodoEntrada, customFrom, customTo, fatMinPreset, fatMinCustom]);

  const toggleCol = (key: string) => {
    setSelectedCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleExport = () => {
    const colMap: Record<string, ExcelColumn<PerformanceLoja>> = {
      id: { header: "ID", value: r => r.id || "", width: 10 },
      loja: { header: "Loja", value: r => r.loja, width: 28 },
      gestor: { header: "Gestor", value: r => r.gestor || "", width: 16 },
      estrategista: { header: "Estrategista", value: r => r.estrategista || "", width: 16 },
      plataforma: { header: "Plataforma", value: r => r.plataforma || "", width: 12 },
      statusLoja: { header: "Status Loja", value: r => r.statusLoja || "", width: 16 },
      status: { header: "Status", value: r => r.status, width: 14 },
      dataEntrada: { header: "Data Entrada", value: r => formatDateBR(r.dataEntrada), width: 14 },
      ltv: { header: "LTV", value: r => r.ltv || "", width: 12 },
      variacao: { header: "Variação %", value: r => r.variacaoPct ?? null, numFmt: '0"%"', width: 12 },
      fatAtual: { header: "Fat. Atual", value: r => r.fatAtual ?? null, numFmt: '"R$" #,##0', width: 14 },
      fatMesAnterior: { header: "Fat. Mês Ant.", value: r => r.fatMesAnterior ?? null, numFmt: '"R$" #,##0', width: 14 },
      fatInicial: { header: "Fat. Inicial", value: r => r.fatInicial ?? null, numFmt: '"R$" #,##0', width: 14 },
    };
    const cols = ALL_COLUMNS.filter(c => selectedCols.includes(c.key)).map(c => colMap[c.key]);
    if (cols.length === 0) return;

    const ts = new Date();
    const stamp = `${ts.getFullYear()}${String(ts.getMonth()+1).padStart(2,"0")}${String(ts.getDate()).padStart(2,"0")}`;
    const tag = statusFilter !== "TODOS" ? `-${statusFilter.toLowerCase()}` : "";
    exportToExcel({
      filename: `performance${tag}-${stamp}`,
      sheetName: "Performance",
      rows: filtered,
      columns: cols,
    });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-success" />
            <h2 className="text-base font-bold text-foreground">Exportar Excel — Performance</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          {/* Atalhos */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Atalhos rápidos</label>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => { setStatusFilter("Crescimento"); setVariacaoSort("DESC"); }} className="px-2.5 py-1 text-xs rounded-md bg-success/15 text-success border border-success/30 hover:bg-success/25">Top Crescimento</button>
              <button onClick={() => { setStatusFilter("Queda"); setVariacaoSort("ASC"); }} className="px-2.5 py-1 text-xs rounded-md bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25">Maiores Quedas</button>
              <button onClick={() => { setStatusFilter("Estável"); setVariacaoSort("NONE"); }} className="px-2.5 py-1 text-xs rounded-md bg-muted text-muted-foreground border border-border hover:text-foreground">Estáveis</button>
              <button onClick={() => { setStatusLojaFilter("EM_CANCEL"); setStatusFilter("TODOS"); }} className="px-2.5 py-1 text-xs rounded-md bg-warning/15 text-warning border border-warning/30 hover:bg-warning/25">Em Cancelamento</button>
              <button onClick={() => { setStatusFilter("TODOS"); setStatusLojaFilter("ATIVAS_CANCEL"); setGestorFilter("TODOS"); setEstrategistaFilter("TODOS"); setVariacaoSort("NONE"); setTopN(""); setPeriodoEntrada("TODOS"); setFatMinPreset("0"); setFatMinCustom(""); }} className="px-2.5 py-1 text-xs rounded-md bg-secondary text-muted-foreground border border-border hover:text-foreground">Limpar filtros</button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Status (tendência)</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="TODOS">Todos</option>
                <option value="Crescimento">Crescimento</option>
                <option value="Estável">Estável</option>
                <option value="Queda">Queda</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Status da loja</label>
              <select value={statusLojaFilter} onChange={e => setStatusLojaFilter(e.target.value as StatusLojaFilter)} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30">
                {(Object.keys(STATUS_LOJA_LABELS) as StatusLojaFilter[]).map(k => (
                  <option key={k} value={k}>{STATUS_LOJA_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Gestor</label>
              <select value={gestorFilter} onChange={e => setGestorFilter(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="TODOS">Todos</option>
                {gestorOptions.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Estrategista</label>
              <select value={estrategistaFilter} onChange={e => setEstrategistaFilter(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="TODOS">Todos</option>
                {estrategistaOptions.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Ordenar por variação</label>
              <select value={variacaoSort} onChange={e => setVariacaoSort(e.target.value as SortOrder)} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="NONE">Sem ordenação</option>
                <option value="DESC">Maior → menor</option>
                <option value="ASC">Menor → maior</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Top N (opcional)</label>
              <input type="number" min={1} value={topN} onChange={e => setTopN(e.target.value)} placeholder="Ex.: 10, 20, 50…" className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={periodoEntrada === "CUSTOM" ? "" : "sm:col-span-3"}>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Período de entrada</label>
              <select value={periodoEntrada} onChange={e => setPeriodoEntrada(e.target.value as PeriodoEntrada)} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30">
                {(Object.keys(PERIODO_LABELS) as PeriodoEntrada[]).map(k => (
                  <option key={k} value={k}>{PERIODO_LABELS[k]}</option>
                ))}
              </select>
            </div>
            {periodoEntrada === "CUSTOM" && (
              <>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">De</label>
                  <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Até</label>
                  <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Faturamento atual mínimo</label>
              <select value={fatMinPreset} onChange={e => { setFatMinPreset(e.target.value); setFatMinCustom(""); }} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="0">Sem mínimo</option>
                <option value="5000">≥ R$ 5.000</option>
                <option value="10000">≥ R$ 10.000</option>
                <option value="20000">≥ R$ 20.000</option>
                <option value="50000">≥ R$ 50.000</option>
                <option value="100000">≥ R$ 100.000</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Ou valor mínimo personalizado (R$)</label>
              <input type="text" inputMode="decimal" value={fatMinCustom} onChange={e => setFatMinCustom(e.target.value)} placeholder="Ex.: 7500" className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">Colunas no Excel</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_COLUMNS.map(c => {
                const active = selectedCols.includes(c.key);
                return (
                  <button
                    key={c.key}
                    onClick={() => toggleCol(c.key)}
                    className={`px-2.5 py-1 text-xs rounded-md border transition-all ${active ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-border hover:text-foreground"}`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg bg-muted/40 border border-border px-3 py-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{filtered.length}</span> loja(s) serão exportadas com essas configurações.
          </div>
        </div>

        <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Cancelar</button>
          <button
            onClick={handleExport}
            disabled={filtered.length === 0 || selectedCols.length === 0}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-success text-success-foreground hover:bg-success/90 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Baixar Excel
          </button>
        </div>
      </div>
    </div>
  );
};

export default PerformanceExcelExportModal;
