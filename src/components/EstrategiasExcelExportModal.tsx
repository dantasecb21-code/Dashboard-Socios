import { useMemo, useState } from "react";
import { X, Download, FileSpreadsheet } from "lucide-react";
import { Estrategia } from "@/services/estrategiasService";
import { exportToExcel, ExcelColumn } from "@/lib/excelExport";

type StatusOpFilter = "TODOS" | "Concluída" | "Aprovada" | "Em andamento" | "Aguardando aprovação" | "Cancelada";
type StatusPrazoFilter = "TODOS" | "No prazo" | "Vencendo" | "Atrasada";
type Plataforma = "TODAS" | "iFood" | "99Food";
type Periodo = "TODOS" | "7D" | "30D" | "90D" | "CUSTOM";
type DateField = "dataCriacao" | "dataInicio" | "dataEntregaPrevista" | "dataConclusao";

const PERIODO_LABELS: Record<Periodo, string> = {
  TODOS: "Qualquer período",
  "7D": "Últimos 7 dias",
  "30D": "Últimos 30 dias",
  "90D": "Últimos 90 dias",
  CUSTOM: "Personalizado",
};

const DATE_FIELD_LABELS: Record<DateField, string> = {
  dataCriacao: "Data de Criação",
  dataInicio: "Data de Início",
  dataEntregaPrevista: "Deadline",
  dataConclusao: "Data de Conclusão",
};

const ALL_COLUMNS = [
  { key: "id", label: "ID" },
  { key: "loja", label: "Loja" },
  { key: "plataforma", label: "Plataforma" },
  { key: "tipoEstrategia", label: "Tipo" },
  { key: "gestorOperacional", label: "Gestor Operacional" },
  { key: "gestorEstrategico", label: "Gestor Estratégico" },
  { key: "statusOperacional", label: "Status" },
  { key: "statusPrazo", label: "Status Prazo" },
  { key: "dataCriacao", label: "Data Criação" },
  { key: "dataInicio", label: "Data Início" },
  { key: "dataEntregaPrevista", label: "Deadline" },
  { key: "dataConclusao", label: "Conclusão" },
  { key: "tempoExecucao", label: "Tempo Execução" },
  { key: "observacao", label: "Observação" },
] as const;

const DEFAULT_COLS = ["loja", "plataforma", "tipoEstrategia", "gestorOperacional", "statusOperacional", "statusPrazo", "dataEntregaPrevista", "dataConclusao"];

const formatDateBR = (d: string | null) => {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

interface Props {
  open: boolean;
  onClose: () => void;
  estrategias: Estrategia[];
}

const EstrategiasExcelExportModal = ({ open, onClose, estrategias }: Props) => {
  const [statusOp, setStatusOp] = useState<StatusOpFilter>("TODOS");
  const [statusPrazo, setStatusPrazo] = useState<StatusPrazoFilter>("TODOS");
  const [plataforma, setPlataforma] = useState<Plataforma>("TODAS");
  const [gestorOp, setGestorOp] = useState<string>("TODOS");
  const [gestorEst, setGestorEst] = useState<string>("TODOS");
  const [tipo, setTipo] = useState<string>("TODOS");
  const [periodo, setPeriodo] = useState<Periodo>("TODOS");
  const [dateField, setDateField] = useState<DateField>("dataCriacao");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [selectedCols, setSelectedCols] = useState<string[]>(DEFAULT_COLS);

  const gestorOpOptions = useMemo(() => {
    const set = new Set<string>();
    estrategias.forEach(e => e.gestorOperacional && set.add(e.gestorOperacional));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [estrategias]);

  const gestorEstOptions = useMemo(() => {
    const set = new Set<string>();
    estrategias.forEach(e => e.gestorEstrategico && set.add(e.gestorEstrategico));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [estrategias]);

  const tipoOptions = useMemo(() => {
    const set = new Set<string>();
    estrategias.forEach(e => e.tipoEstrategia && set.add(e.tipoEstrategia));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [estrategias]);

  const filtered = useMemo(() => {
    let r = estrategias;
    if (statusOp !== "TODOS") r = r.filter(e => e.statusOperacional === statusOp);
    if (statusPrazo !== "TODOS") r = r.filter(e => e.statusPrazo === statusPrazo);
    if (plataforma !== "TODAS") r = r.filter(e => e.plataforma === plataforma);
    if (gestorOp !== "TODOS") r = r.filter(e => e.gestorOperacional === gestorOp);
    if (gestorEst !== "TODOS") r = r.filter(e => e.gestorEstrategico === gestorEst);
    if (tipo !== "TODOS") r = r.filter(e => e.tipoEstrategia === tipo);

    if (periodo !== "TODOS") {
      const now = new Date();
      let from: Date | null = null;
      let to: Date | null = null;
      if (periodo === "CUSTOM") {
        from = customFrom ? new Date(customFrom + "T00:00:00") : null;
        to = customTo ? new Date(customTo + "T23:59:59") : null;
      } else {
        const days = periodo === "7D" ? 7 : periodo === "30D" ? 30 : 90;
        from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        to = now;
      }
      r = r.filter(e => {
        const raw = e[dateField];
        if (!raw) return false;
        const d = new Date(raw);
        if (isNaN(d.getTime())) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    }
    return r;
  }, [estrategias, statusOp, statusPrazo, plataforma, gestorOp, gestorEst, tipo, periodo, customFrom, customTo, dateField]);

  const toggleCol = (key: string) => {
    setSelectedCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleExport = () => {
    const colMap: Record<string, ExcelColumn<Estrategia>> = {
      id: { header: "ID", value: e => e.id || "", width: 10 },
      loja: { header: "Loja", value: e => e.loja, width: 28 },
      plataforma: { header: "Plataforma", value: e => e.plataforma, width: 12 },
      tipoEstrategia: { header: "Tipo", value: e => e.tipoEstrategia || "", width: 18 },
      gestorOperacional: { header: "Gestor Operacional", value: e => e.gestorOperacional || "", width: 20 },
      gestorEstrategico: { header: "Gestor Estratégico", value: e => e.gestorEstrategico || "", width: 20 },
      statusOperacional: { header: "Status", value: e => e.statusOperacional || "", width: 18 },
      statusPrazo: { header: "Status Prazo", value: e => e.statusPrazo || "", width: 14 },
      dataCriacao: { header: "Data Criação", value: e => formatDateBR(e.dataCriacao), width: 12 },
      dataInicio: { header: "Data Início", value: e => formatDateBR(e.dataInicio), width: 12 },
      dataEntregaPrevista: { header: "Deadline", value: e => formatDateBR(e.dataEntregaPrevista), width: 12 },
      dataConclusao: { header: "Conclusão", value: e => formatDateBR(e.dataConclusao), width: 12 },
      tempoExecucao: { header: "Tempo Execução", value: e => e.tempoExecucao || "", width: 14 },
      observacao: { header: "Observação", value: e => e.observacao || "", width: 40 },
    };
    const cols = ALL_COLUMNS.filter(c => selectedCols.includes(c.key)).map(c => colMap[c.key]);
    if (cols.length === 0) return;

    const ts = new Date();
    const stamp = `${ts.getFullYear()}${String(ts.getMonth()+1).padStart(2,"0")}${String(ts.getDate()).padStart(2,"0")}`;
    const tag = statusPrazo !== "TODOS" ? `-${statusPrazo.toLowerCase().replace(/\s+/g, "-")}`
      : statusOp !== "TODOS" ? `-${statusOp.toLowerCase().replace(/\s+/g, "-")}`
      : "";
    exportToExcel({
      filename: `estrategias${tag}-${stamp}`,
      sheetName: "Estratégias",
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
            <h2 className="text-base font-bold text-foreground">Exportar Excel — Estratégias</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          {/* Atalhos rápidos */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Atalhos rápidos</label>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => { setStatusPrazo("Atrasada"); setStatusOp("TODOS"); }} className="px-2.5 py-1 text-xs rounded-md bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25">Só Atrasadas</button>
              <button onClick={() => { setStatusPrazo("Vencendo"); setStatusOp("TODOS"); }} className="px-2.5 py-1 text-xs rounded-md bg-warning/15 text-warning border border-warning/30 hover:bg-warning/25">Vencendo</button>
              <button onClick={() => { setStatusOp("Em andamento"); setStatusPrazo("TODOS"); }} className="px-2.5 py-1 text-xs rounded-md bg-info/15 text-info border border-info/30 hover:bg-info/25">Em andamento</button>
              <button onClick={() => { setStatusOp("Aguardando aprovação"); setStatusPrazo("TODOS"); }} className="px-2.5 py-1 text-xs rounded-md bg-warning/15 text-warning border border-warning/30 hover:bg-warning/25">Aguardando aprovação</button>
              <button onClick={() => { setStatusOp("Concluída"); setStatusPrazo("TODOS"); }} className="px-2.5 py-1 text-xs rounded-md bg-success/15 text-success border border-success/30 hover:bg-success/25">Concluídas</button>
              <button onClick={() => { setStatusOp("TODOS"); setStatusPrazo("TODOS"); setPlataforma("TODAS"); setGestorOp("TODOS"); setGestorEst("TODOS"); setTipo("TODOS"); setPeriodo("TODOS"); }} className="px-2.5 py-1 text-xs rounded-md bg-secondary text-muted-foreground border border-border hover:text-foreground">Limpar filtros</button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Status Operacional</label>
              <select value={statusOp} onChange={e => setStatusOp(e.target.value as StatusOpFilter)} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="TODOS">Todos</option>
                <option value="Concluída">Concluída</option>
                <option value="Aprovada">Aprovada</option>
                <option value="Em andamento">Em andamento</option>
                <option value="Aguardando aprovação">Aguardando aprovação</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Status de Prazo</label>
              <select value={statusPrazo} onChange={e => setStatusPrazo(e.target.value as StatusPrazoFilter)} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="TODOS">Todos</option>
                <option value="No prazo">No prazo</option>
                <option value="Vencendo">Vencendo</option>
                <option value="Atrasada">Atrasada</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Plataforma</label>
              <select value={plataforma} onChange={e => setPlataforma(e.target.value as Plataforma)} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="TODAS">Todas</option>
                <option value="iFood">iFood</option>
                <option value="99Food">99Food</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Tipo de Estratégia</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="TODOS">Todos</option>
                {tipoOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Gestor Operacional</label>
              <select value={gestorOp} onChange={e => setGestorOp(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="TODOS">Todos</option>
                {gestorOpOptions.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Gestor Estratégico</label>
              <select value={gestorEst} onChange={e => setGestorEst(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="TODOS">Todos</option>
                {gestorEstOptions.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Período</label>
              <select value={periodo} onChange={e => setPeriodo(e.target.value as Periodo)} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30">
                {(Object.keys(PERIODO_LABELS) as Periodo[]).map(k => <option key={k} value={k}>{PERIODO_LABELS[k]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Campo de data</label>
              <select value={dateField} onChange={e => setDateField(e.target.value as DateField)} disabled={periodo === "TODOS"} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50">
                {(Object.keys(DATE_FIELD_LABELS) as DateField[]).map(k => <option key={k} value={k}>{DATE_FIELD_LABELS[k]}</option>)}
              </select>
            </div>
            {periodo === "CUSTOM" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">De</label>
                  <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="w-full px-2 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Até</label>
                  <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="w-full px-2 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
            )}
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
            <span className="font-semibold text-foreground">{filtered.length}</span> estratégia(s) serão exportadas com essas configurações.
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

export default EstrategiasExcelExportModal;
