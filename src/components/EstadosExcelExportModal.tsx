import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, FileSpreadsheet } from "lucide-react";
import { exportToExcel, ExcelColumn } from "@/lib/excelExport";
import type { EstadosAnalise, AggregatedRow } from "@/hooks/useEstadosAnalise";

type Agrupamento = "ESTADO" | "NICHO" | "ESTADO_NICHO" | "LOJA";
type TendenciaFilter = "TODOS" | "ALTA" | "QUEDA" | "ESTAVEL";

const AGRUP_LABELS: Record<Agrupamento, string> = {
  ESTADO: "Por Estado",
  NICHO: "Por Nicho",
  ESTADO_NICHO: "Por Estado + Nicho",
  LOJA: "Detalhado por Loja",
};

const TEND_LABELS: Record<TendenciaFilter, string> = {
  TODOS: "Todos",
  ALTA: "Apenas em alta (>0%)",
  QUEDA: "Apenas em queda (<0%)",
  ESTAVEL: "Apenas estáveis (-0,5% a +0,5%)",
};

const ALL_COLS_AGG = [
  { key: "estado", label: "Estado" },
  { key: "nicho", label: "Nicho" },
  { key: "lojas", label: "Lojas" },
  { key: "fatAtual", label: "Fat. Atual" },
  { key: "fatAnterior", label: "Mês Anterior" },
  { key: "variacaoAbs", label: "Variação R$" },
  { key: "variacaoPct", label: "Variação %" },
] as const;

const ALL_COLS_LOJA = [
  { key: "loja", label: "Loja" },
  { key: "estado", label: "Estado" },
  { key: "nicho", label: "Nicho" },
  { key: "gestor", label: "Gestor" },
  { key: "plataforma", label: "Plataforma" },
  { key: "fatAtual", label: "Fat. Atual" },
  { key: "fatAnterior", label: "Mês Anterior" },
  { key: "variacaoPct", label: "Variação %" },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  analise: EstadosAnalise;
}

const EstadosExcelExportModal = ({ open, onClose, analise }: Props) => {
  const [agrupamento, setAgrupamento] = useState<Agrupamento>("ESTADO");
  const [tendencia, setTendencia] = useState<TendenciaFilter>("TODOS");
  const [minLojas, setMinLojas] = useState<string>("");
  const [topN, setTopN] = useState<string>("");
  const [sortBy, setSortBy] = useState<"FAT_DESC" | "FAT_ASC" | "VAR_DESC" | "VAR_ASC">("FAT_DESC");
  const [selectedAggCols, setSelectedAggCols] = useState<string[]>(["estado", "nicho", "lojas", "fatAtual", "fatAnterior", "variacaoPct"]);
  const [selectedLojaCols, setSelectedLojaCols] = useState<string[]>(["loja", "estado", "nicho", "gestor", "fatAtual", "fatAnterior", "variacaoPct"]);

  const isLoja = agrupamento === "LOJA";

  const filteredAgg = useMemo<AggregatedRow[]>(() => {
    if (isLoja) return [];
    let base: AggregatedRow[];
    if (agrupamento === "ESTADO") base = analise.porEstado;
    else if (agrupamento === "NICHO") base = analise.porNicho;
    else base = analise.porEstadoNicho;

    let r = [...base];
    const min = parseInt(minLojas, 10);
    if (!isNaN(min) && min > 0) r = r.filter((x) => x.lojas >= min);
    if (tendencia !== "TODOS") {
      r = r.filter((x) => {
        if (x.variacaoPct === null) return false;
        if (tendencia === "ALTA") return x.variacaoPct > 0.5;
        if (tendencia === "QUEDA") return x.variacaoPct < -0.5;
        return Math.abs(x.variacaoPct) <= 0.5;
      });
    }
    r.sort((a, b) => {
      if (sortBy === "FAT_DESC") return b.faturamentoAtual - a.faturamentoAtual;
      if (sortBy === "FAT_ASC") return a.faturamentoAtual - b.faturamentoAtual;
      const av = a.variacaoPct ?? 0;
      const bv = b.variacaoPct ?? 0;
      return sortBy === "VAR_DESC" ? bv - av : av - bv;
    });
    const n = parseInt(topN, 10);
    if (!isNaN(n) && n > 0) r = r.slice(0, n);
    return r;
  }, [analise, agrupamento, tendencia, minLojas, sortBy, topN, isLoja]);

  const filteredLojas = useMemo(() => {
    if (!isLoja) return [];
    let r = [...analise.rows];
    if (tendencia !== "TODOS") {
      r = r.filter((x) => {
        if (x.variacaoPct === null) return false;
        if (tendencia === "ALTA") return x.variacaoPct > 0.5;
        if (tendencia === "QUEDA") return x.variacaoPct < -0.5;
        return Math.abs(x.variacaoPct) <= 0.5;
      });
    }
    r.sort((a, b) => {
      if (sortBy === "FAT_DESC") return b.fatAtual - a.fatAtual;
      if (sortBy === "FAT_ASC") return a.fatAtual - b.fatAtual;
      const av = a.variacaoPct ?? 0;
      const bv = b.variacaoPct ?? 0;
      return sortBy === "VAR_DESC" ? bv - av : av - bv;
    });
    const n = parseInt(topN, 10);
    if (!isNaN(n) && n > 0) r = r.slice(0, n);
    return r;
  }, [analise, tendencia, sortBy, topN, isLoja]);

  const toggleAgg = (k: string) =>
    setSelectedAggCols((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  const toggleLoja = (k: string) =>
    setSelectedLojaCols((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  const handleExport = () => {
    const ts = new Date();
    const stamp = `${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(2, "0")}${String(ts.getDate()).padStart(2, "0")}`;

    if (isLoja) {
      const colMap: Record<string, ExcelColumn<typeof analise.rows[number]>> = {
        loja: { header: "Loja", value: (r) => r.loja, width: 28 },
        estado: { header: "Estado", value: (r) => r.estado, width: 12 },
        nicho: { header: "Nicho", value: (r) => r.nicho, width: 16 },
        gestor: { header: "Gestor", value: (r) => r.gestor || "", width: 16 },
        plataforma: { header: "Plataforma", value: (r) => r.plataforma || "", width: 12 },
        fatAtual: { header: "Fat. Atual", value: (r) => r.fatAtual, numFmt: '"R$" #,##0', width: 14 },
        fatAnterior: { header: "Mês Anterior", value: (r) => r.fatAnterior, numFmt: '"R$" #,##0', width: 14 },
        variacaoPct: { header: "Variação %", value: (r) => r.variacaoPct, numFmt: '0.0"%"', width: 12 },
      };
      const cols = ALL_COLS_LOJA.filter((c) => selectedLojaCols.includes(c.key)).map((c) => colMap[c.key]);
      if (cols.length === 0) return;
      exportToExcel({ filename: `estados-lojas-${stamp}`, sheetName: "Estados", rows: filteredLojas, columns: cols });
    } else {
      const colMap: Record<string, ExcelColumn<AggregatedRow>> = {
        estado: { header: "Estado", value: (r) => r.estado || "", width: 12 },
        nicho: { header: "Nicho", value: (r) => r.nicho || "", width: 16 },
        lojas: { header: "Lojas", value: (r) => r.lojas, width: 8 },
        fatAtual: { header: "Fat. Atual", value: (r) => r.faturamentoAtual, numFmt: '"R$" #,##0', width: 14 },
        fatAnterior: { header: "Mês Anterior", value: (r) => r.faturamentoAnterior, numFmt: '"R$" #,##0', width: 14 },
        variacaoAbs: { header: "Variação R$", value: (r) => r.variacaoAbs, numFmt: '"R$" #,##0', width: 14 },
        variacaoPct: { header: "Variação %", value: (r) => r.variacaoPct, numFmt: '0.0"%"', width: 12 },
      };
      const baseCols = ALL_COLS_AGG.filter((c) => {
        if (!selectedAggCols.includes(c.key)) return false;
        if (agrupamento === "ESTADO" && c.key === "nicho") return false;
        if (agrupamento === "NICHO" && c.key === "estado") return false;
        return true;
      });
      const cols = baseCols.map((c) => colMap[c.key]);
      if (cols.length === 0) return;
      exportToExcel({ filename: `estados-${agrupamento.toLowerCase()}-${stamp}`, sheetName: "Estados", rows: filteredAgg, columns: cols });
    }
    onClose();
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-success" />
            <h2 className="text-base font-bold text-foreground">Exportar Excel — Estados & Nichos</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Atalhos</label>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => { setAgrupamento("ESTADO"); setTendencia("ALTA"); setSortBy("VAR_DESC"); setTopN("10"); }} className="px-2.5 py-1 text-xs rounded-md bg-success/15 text-success border border-success/30 hover:bg-success/25">Estados em alta (top 10)</button>
              <button onClick={() => { setAgrupamento("ESTADO"); setTendencia("QUEDA"); setSortBy("VAR_ASC"); setTopN("10"); }} className="px-2.5 py-1 text-xs rounded-md bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25">Estados em queda (top 10)</button>
              <button onClick={() => { setAgrupamento("NICHO"); setTendencia("TODOS"); setSortBy("FAT_DESC"); setTopN(""); }} className="px-2.5 py-1 text-xs rounded-md bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25">Nichos por faturamento</button>
              <button onClick={() => { setAgrupamento("ESTADO"); setTendencia("TODOS"); setSortBy("FAT_DESC"); setTopN(""); setMinLojas(""); }} className="px-2.5 py-1 text-xs rounded-md bg-secondary text-muted-foreground border border-border hover:text-foreground">Limpar</button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Agrupamento</label>
              <select value={agrupamento} onChange={(e) => setAgrupamento(e.target.value as Agrupamento)} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30">
                {(Object.keys(AGRUP_LABELS) as Agrupamento[]).map((k) => (
                  <option key={k} value={k}>{AGRUP_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Tendência</label>
              <select value={tendencia} onChange={(e) => setTendencia(e.target.value as TendenciaFilter)} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30">
                {(Object.keys(TEND_LABELS) as TendenciaFilter[]).map((k) => (
                  <option key={k} value={k}>{TEND_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Ordenar por</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="FAT_DESC">Faturamento (maior → menor)</option>
                <option value="FAT_ASC">Faturamento (menor → maior)</option>
                <option value="VAR_DESC">Variação (maior → menor)</option>
                <option value="VAR_ASC">Variação (menor → maior)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Top N (opcional)</label>
              <input type="number" min={1} value={topN} onChange={(e) => setTopN(e.target.value)} placeholder="Ex.: 5, 10, 20…" className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            {!isLoja && (
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Mínimo de lojas no grupo</label>
                <input type="number" min={1} value={minLojas} onChange={(e) => setMinLojas(e.target.value)} placeholder="Ex.: 2" className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">Colunas no Excel</label>
            <div className="flex flex-wrap gap-1.5">
              {(isLoja ? ALL_COLS_LOJA : ALL_COLS_AGG).map((c) => {
                if (!isLoja && agrupamento === "ESTADO" && c.key === "nicho") return null;
                if (!isLoja && agrupamento === "NICHO" && c.key === "estado") return null;
                const sel = isLoja ? selectedLojaCols : selectedAggCols;
                const active = sel.includes(c.key);
                return (
                  <button
                    key={c.key}
                    onClick={() => (isLoja ? toggleLoja(c.key) : toggleAgg(c.key))}
                    className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                      active
                        ? "bg-primary/15 text-primary border-primary/30"
                        : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            {isLoja
              ? `${filteredLojas.length} loja(s) serão exportadas.`
              : `${filteredAgg.length} grupo(s) serão exportados.`}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-secondary text-muted-foreground border border-border hover:text-foreground">Cancelar</button>
          <button onClick={handleExport} className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-success text-success-foreground hover:opacity-90">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Baixar Excel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default EstadosExcelExportModal;
