import { useMemo, useState } from "react";
import { X, Download, FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PerformanceLoja } from "@/services/performanceService";

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

// Tenta interpretar a data de entrada em vários formatos (ISO, dd/mm/yyyy, etc.)
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

interface Props {
  open: boolean;
  onClose: () => void;
  rows: PerformanceLoja[];
}

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
  const iso = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return str;
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
  { key: "variacao", label: "Variação" },
  { key: "fatAtual", label: "Fat. Atual" },
  { key: "fatMesAnterior", label: "Fat. Mês Ant." },
  { key: "fatInicial", label: "Fat. Inicial" },
] as const;

const DEFAULT_COLS = ["id", "loja", "gestor", "estrategista", "statusLoja", "status", "variacao", "fatAtual", "fatMesAnterior"];

const PerformancePdfExportModal = ({ open, onClose, rows }: Props) => {
  const [title, setTitle] = useState("Cases de Sucesso — Performance iFood");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Crescimento");
  const [statusLojaFilter, setStatusLojaFilter] = useState<StatusLojaFilter>("ATIVAS_CANCEL");
  const [gestorFilter, setGestorFilter] = useState<string>("TODOS");
  const [estrategistaFilter, setEstrategistaFilter] = useState<string>("TODOS");
  const [variacaoSort, setVariacaoSort] = useState<SortOrder>("DESC");
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

  const previewRows = useMemo(() => {
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

    // Filtro por período de entrada
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

    // Filtro por faturamento atual mínimo
    const fatMinValue = (() => {
      const custom = parseFloat(fatMinCustom.replace(/\./g, "").replace(",", "."));
      if (!isNaN(custom) && custom > 0) return custom;
      const preset = parseFloat(fatMinPreset);
      return isNaN(preset) ? 0 : preset;
    })();
    if (fatMinValue > 0) {
      r = r.filter(x => (x.fatAtual ?? 0) >= fatMinValue);
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
    const n = parseInt(topN, 10);
    if (!isNaN(n) && n > 0) r = r.slice(0, n);
    return r;
  }, [rows, statusFilter, statusLojaFilter, gestorFilter, estrategistaFilter, variacaoSort, topN, periodoEntrada, customFrom, customTo, fatMinPreset, fatMinCustom]);

  const toggleCol = (key: string) => {
    setSelectedCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const cellValue = (r: PerformanceLoja, key: string): string => {
    switch (key) {
      case "id": return r.id || "—";
      case "loja": return r.loja;
      case "gestor": return r.gestor || "—";
      case "estrategista": return r.estrategista || "—";
      case "plataforma": return r.plataforma || "—";
      case "statusLoja": return r.statusLoja || "—";
      case "status": return r.status;
      case "dataEntrada": return formatDateBR(r.dataEntrada);
      case "ltv": return r.ltv || "—";
      case "variacao": return formatPct(r.variacaoPct);
      case "fatAtual": return formatBRL(r.fatAtual);
      case "fatMesAnterior": return formatBRL(r.fatMesAnterior);
      case "fatInicial": return formatBRL(r.fatInicial);
      default: return "";
    }
  };

  const handleExport = () => {
    const cols = ALL_COLUMNS.filter(c => selectedCols.includes(c.key));
    if (cols.length === 0) return;

    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const now = new Date();

    const filterParts: string[] = [];
    if (statusFilter !== "TODOS") filterParts.push(`Status: ${statusFilter}`);
    filterParts.push(`Status Loja: ${STATUS_LOJA_LABELS[statusLojaFilter]}`);
    if (gestorFilter !== "TODOS") filterParts.push(`Gestor: ${gestorFilter}`);
    if (estrategistaFilter !== "TODOS") filterParts.push(`Estrategista: ${estrategistaFilter}`);
    if (periodoEntrada !== "TODOS") {
      if (periodoEntrada === "CUSTOM") {
        const f = customFrom ? formatDateBR(customFrom) : "—";
        const t = customTo ? formatDateBR(customTo) : "—";
        filterParts.push(`Entrada: ${f} a ${t}`);
      } else {
        filterParts.push(`Entrada: ${PERIODO_LABELS[periodoEntrada]}`);
      }
    }
    {
      const customF = parseFloat(fatMinCustom.replace(/\./g, "").replace(",", "."));
      const presetF = parseFloat(fatMinPreset);
      const fatMinV = !isNaN(customF) && customF > 0 ? customF : (isNaN(presetF) ? 0 : presetF);
      if (fatMinV > 0) filterParts.push(`Fat. Atual ≥ ${formatBRL(fatMinV)}`);
    }
    if (variacaoSort !== "NONE") filterParts.push(`Ordem: Variação ${variacaoSort === "DESC" ? "↓" : "↑"}`);
    const n = parseInt(topN, 10);
    if (!isNaN(n) && n > 0) filterParts.push(`Top ${n}`);

    doc.setFontSize(15);
    doc.setTextColor(20);
    doc.text(title, 40, 42);
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(`Gerado em ${now.toLocaleString("pt-BR")}  •  ${previewRows.length} lojas`, 40, 58);
    doc.text(`Filtros: ${filterParts.join(" | ")}`, 40, 72);

    const variacaoIdx = cols.findIndex(c => c.key === "variacao");
    const rightAlignKeys = new Set(["variacao", "fatAtual", "fatMesAnterior", "fatInicial"]);

    autoTable(doc, {
      startY: 86,
      head: [cols.map(c => c.label)],
      body: previewRows.map(r => cols.map(c => cellValue(r, c.key))),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 247, 252] },
      columnStyles: cols.reduce((acc, c, i) => {
        if (rightAlignKeys.has(c.key)) acc[i] = { halign: "right" };
        return acc;
      }, {} as Record<number, { halign: "right" }>),
      didParseCell: (data) => {
        if (data.section === "body" && variacaoIdx >= 0 && data.column.index === variacaoIdx) {
          const raw = previewRows[data.row.index]?.variacaoPct;
          if (raw !== null && raw !== undefined) {
            if (raw > 0) { data.cell.styles.textColor = [22, 163, 74]; data.cell.styles.fontStyle = "bold"; }
            else if (raw < 0) { data.cell.styles.textColor = [220, 38, 38]; data.cell.styles.fontStyle = "bold"; }
          }
        }
      },
    });

    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    doc.save(`cases-sucesso-${ts}.pdf`);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <h2 className="text-base font-bold text-foreground">Exportar PDF — Cases de Sucesso</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Título do relatório</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
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
                <option value="DESC">Maior → menor</option>
                <option value="ASC">Menor → maior</option>
                <option value="NONE">Sem ordenação</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Top N (opcional)</label>
              <input
                type="number"
                min={1}
                value={topN}
                onChange={e => setTopN(e.target.value)}
                placeholder="Ex.: 10, 20, 50…"
                className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={periodoEntrada === "CUSTOM" ? "" : "sm:col-span-3"}>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Período de entrada</label>
              <select
                value={periodoEntrada}
                onChange={e => setPeriodoEntrada(e.target.value as PeriodoEntrada)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {(Object.keys(PERIODO_LABELS) as PeriodoEntrada[]).map(k => (
                  <option key={k} value={k}>{PERIODO_LABELS[k]}</option>
                ))}
              </select>
            </div>
            {periodoEntrada === "CUSTOM" && (
              <>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">De</label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={e => setCustomFrom(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Até</label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={e => setCustomTo(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Faturamento atual mínimo</label>
              <select
                value={fatMinPreset}
                onChange={e => { setFatMinPreset(e.target.value); setFatMinCustom(""); }}
                className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
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
              <input
                type="text"
                inputMode="decimal"
                value={fatMinCustom}
                onChange={e => setFatMinCustom(e.target.value)}
                placeholder="Ex.: 7500"
                className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">Colunas no PDF</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_COLUMNS.map(c => {
                const active = selectedCols.includes(c.key);
                return (
                  <button
                    key={c.key}
                    onClick={() => toggleCol(c.key)}
                    className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg bg-muted/40 border border-border px-3 py-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{previewRows.length}</span> loja(s) serão exportadas com essas configurações.
          </div>
        </div>

        <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleExport}
            disabled={previewRows.length === 0 || selectedCols.length === 0}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Baixar PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default PerformancePdfExportModal;
