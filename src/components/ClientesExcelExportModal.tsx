import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, Download, FileSpreadsheet } from "lucide-react";
import { ClientTableRow } from "./ClientTable";
import { exportToExcel, ExcelColumn } from "@/lib/excelExport";

type SituacaoMode = "TODOS" | "ATIVAS" | "ESPECIFICA";

const ALL_SITUACOES = [
  "PAGO", "A PAGAR", "NOVO CLIENTE", "ATRASO DO MÊS", "ATRASADO",
  "ACORDO", "SINAL", "PENDÊNCIA", "EM CANCELAMENTO", "EM CANCELAMENTO/ATRASADO",
  "EM CANCELAMENTO/PAGO", "CANCELADO",
  "INATIVO", "PAUSADO", "SEM RESULTADO", "NÃO COBRAR",
];

const ALL_COLUMNS = [
  { key: "id", label: "ID" },
  { key: "empresa", label: "Empresa" },
  { key: "razaoSocial", label: "Razão Social" },
  { key: "cnpj", label: "CNPJ" },
  { key: "situacao", label: "Situação" },
  { key: "valorFixo", label: "Valor Mensal" },
  { key: "valorAtrasado", label: "Valor Atrasado" },
  { key: "atrasadoComJuros", label: "Atrasado c/ Juros" },
  { key: "diasAtraso", label: "Dias em Atraso" },
  { key: "gestao", label: "Gestão" },
  { key: "gestor", label: "Gestor" },
  { key: "cliente", label: "Cliente" },
  { key: "regiao", label: "Região" },
  { key: "estado", label: "Estado" },
  { key: "entrada", label: "Entrada" },
  { key: "ultimoPagamento", label: "Últ. Pagamento" },
  { key: "qtdMeses", label: "Qtd. Meses (LTV)" },
  { key: "fidelidade", label: "Fidelidade" },
  { key: "contrato", label: "Contrato" },
  { key: "plano", label: "Plano" },
  { key: "formaPagamento", label: "Forma Pagamento" },
  { key: "closer", label: "Closer" },
  { key: "agender", label: "Agender" },
  { key: "email", label: "Email" },
  { key: "telefone", label: "Telefone" },
] as const;

const DEFAULT_COLS = ["id", "empresa", "situacao", "valorFixo", "gestao", "gestor", "cliente", "regiao", "diasAtraso", "valorAtrasado"];
const INACTIVE_STATUSES = ["INATIVO", "CANCELADO", "EM CANCELAMENTO", "EM CANCELAMENTO/ATRASADO", "EM CANCELAMENTO/PAGO", "PAUSADO"];

interface Props {
  open: boolean;
  onClose: () => void;
  clients: ClientTableRow[];
}

const ClientesExcelExportModal = ({ open, onClose, clients }: Props) => {
  const [situacaoMode, setSituacaoMode] = useState<SituacaoMode>("TODOS");
  const [situacoesSelecionadas, setSituacoesSelecionadas] = useState<string[]>([]);
  const [gestaoFilter, setGestaoFilter] = useState<string>("TODOS");
  const [gestorFilter, setGestorFilter] = useState<string>("TODOS");
  const [regiaoFilter, setRegiaoFilter] = useState<string>("TODOS");
  const [valorMin, setValorMin] = useState<string>("");
  const [diasAtrasoMin, setDiasAtrasoMin] = useState<string>("");
  const [selectedCols, setSelectedCols] = useState<string[]>(DEFAULT_COLS);

  const situacaoOptions = useMemo(() => {
    const set = new Set<string>();
    clients.forEach(c => c.situacao && set.add(c.situacao));
    return Array.from(set).sort();
  }, [clients]);

  const gestaoOptions = useMemo(() => {
    const set = new Set<string>();
    clients.forEach(c => c.gestao && set.add(c.gestao));
    return Array.from(set).sort();
  }, [clients]);

  const gestorOptions = useMemo(() => {
    const set = new Set<string>();
    clients.forEach(c => c.gestor && set.add(c.gestor));
    return Array.from(set).sort();
  }, [clients]);

  const regiaoOptions = useMemo(() => {
    const set = new Set<string>();
    clients.forEach(c => c.regiao && set.add(c.regiao));
    return Array.from(set).sort();
  }, [clients]);

  const filtered = useMemo(() => {
    let r = clients;
    if (situacaoMode === "ATIVAS") {
      r = r.filter(c => !INACTIVE_STATUSES.includes((c.situacao || "").toUpperCase()));
    } else if (situacaoMode === "ESPECIFICA" && situacoesSelecionadas.length > 0) {
      r = r.filter(c => situacoesSelecionadas.includes((c.situacao || "").toUpperCase()));
    }
    if (gestaoFilter !== "TODOS") r = r.filter(c => c.gestao === gestaoFilter);
    if (gestorFilter !== "TODOS") r = r.filter(c => (c.gestor || "") === gestorFilter);
    if (regiaoFilter !== "TODOS") r = r.filter(c => c.regiao === regiaoFilter);
    const vMin = parseFloat(valorMin.replace(/\./g, "").replace(",", "."));
    if (!isNaN(vMin) && vMin > 0) r = r.filter(c => (c.valorFixo || 0) >= vMin);
    const dMin = parseInt(diasAtrasoMin, 10);
    if (!isNaN(dMin) && dMin > 0) r = r.filter(c => (c.diasAtraso || 0) >= dMin);
    return r;
  }, [clients, situacaoMode, situacoesSelecionadas, gestaoFilter, gestorFilter, regiaoFilter, valorMin, diasAtrasoMin]);

  const toggleSituacao = (s: string) => {
    setSituacoesSelecionadas(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const toggleCol = (key: string) => {
    setSelectedCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleExport = () => {
    const colMap: Record<string, ExcelColumn<ClientTableRow>> = {
      id: { header: "ID", value: c => c.id || "", width: 10 },
      empresa: { header: "Empresa", value: c => c.empresa, width: 30 },
      razaoSocial: { header: "Razão Social", value: c => c.razaoSocial || "", width: 30 },
      cnpj: { header: "CNPJ", value: c => c.cnpj || "", width: 18 },
      situacao: { header: "Situação", value: c => c.situacao || "", width: 16 },
      valorFixo: { header: "Valor Mensal", value: c => c.valorFixo ?? null, numFmt: '"R$" #,##0.00', width: 14 },
      valorAtrasado: { header: "Valor Atrasado", value: c => c.valorAtrasado ?? null, numFmt: '"R$" #,##0.00', width: 14 },
      atrasadoComJuros: { header: "Atrasado c/ Juros", value: c => c.atrasadoComJuros ?? null, numFmt: '"R$" #,##0.00', width: 16 },
      diasAtraso: { header: "Dias em Atraso", value: c => c.diasAtraso ?? 0, width: 12 },
      gestao: { header: "Gestão", value: c => c.gestao || "", width: 14 },
      gestor: { header: "Gestor", value: c => c.gestor || "", width: 16 },
      cliente: { header: "Cliente", value: c => c.cliente || "", width: 22 },
      regiao: { header: "Região", value: c => c.regiao || "", width: 10 },
      estado: { header: "Estado", value: c => c.estado || "", width: 10 },
      entrada: { header: "Entrada", value: c => c.entrada || "", width: 12 },
      ultimoPagamento: { header: "Últ. Pagamento", value: c => c.ultimoPagamento || "", width: 14 },
      qtdMeses: { header: "Qtd. Meses (LTV)", value: c => c.qtdMeses ?? 0, width: 12 },
      fidelidade: { header: "Fidelidade", value: c => c.fidelidade || "", width: 14 },
      contrato: { header: "Contrato", value: c => c.contrato || "", width: 14 },
      plano: { header: "Plano", value: c => c.plano || "", width: 14 },
      formaPagamento: { header: "Forma Pagamento", value: c => c.formaPagamento || "", width: 16 },
      closer: { header: "Closer", value: c => c.closer || "", width: 14 },
      agender: { header: "Agender", value: c => c.agender || "", width: 14 },
      email: { header: "Email", value: c => c.email || "", width: 26 },
      telefone: { header: "Telefone", value: c => c.telefone || "", width: 16 },
    };
    const cols = ALL_COLUMNS.filter(c => selectedCols.includes(c.key)).map(c => colMap[c.key]);
    if (cols.length === 0) return;

    const ts = new Date();
    const stamp = `${ts.getFullYear()}${String(ts.getMonth()+1).padStart(2,"0")}${String(ts.getDate()).padStart(2,"0")}`;
    const tag = situacaoMode === "ATIVAS" ? "-ativas"
      : situacaoMode === "ESPECIFICA" && situacoesSelecionadas.length > 0
        ? `-${situacoesSelecionadas.map(s => s.toLowerCase().replace(/\s+/g, "-")).join("_")}`
        : "";
    exportToExcel({
      filename: `clientes${tag}-${stamp}`,
      sheetName: "Clientes",
      rows: filtered,
      columns: cols,
    });
    onClose();
  };

  if (!open) return null;

  return createPortal((
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-success" />
            <h2 className="text-base font-bold text-foreground">Exportar Excel — Clientes</h2>
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
              <button onClick={() => { setSituacaoMode("ATIVAS"); setSituacoesSelecionadas([]); setDiasAtrasoMin(""); }} className="px-2.5 py-1 text-xs rounded-md bg-success/15 text-success border border-success/30 hover:bg-success/25">Só Ativas</button>
              <button onClick={() => { setSituacaoMode("ESPECIFICA"); setSituacoesSelecionadas(["ATRASADO", "ATRASO DO MÊS"]); }} className="px-2.5 py-1 text-xs rounded-md bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25">Atrasados (todos)</button>
              <button onClick={() => { setSituacaoMode("ESPECIFICA"); setSituacoesSelecionadas(["ATRASO DO MÊS"]); }} className="px-2.5 py-1 text-xs rounded-md bg-warning/15 text-warning border border-warning/30 hover:bg-warning/25">Atraso do Mês</button>
              <button onClick={() => { setSituacaoMode("ESPECIFICA"); setSituacoesSelecionadas(["EM CANCELAMENTO"]); }} className="px-2.5 py-1 text-xs rounded-md bg-warning/15 text-warning border border-warning/30 hover:bg-warning/25">Em Cancelamento</button>
              <button onClick={() => { setSituacaoMode("ESPECIFICA"); setSituacoesSelecionadas(["CANCELADO"]); }} className="px-2.5 py-1 text-xs rounded-md bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25">Cancelados</button>
              <button onClick={() => { setSituacaoMode("ESPECIFICA"); setSituacoesSelecionadas(["PAGO"]); }} className="px-2.5 py-1 text-xs rounded-md bg-success/15 text-success border border-success/30 hover:bg-success/25">Pagos</button>
              <button onClick={() => { setSituacaoMode("TODOS"); setSituacoesSelecionadas([]); setGestaoFilter("TODOS"); setGestorFilter("TODOS"); setRegiaoFilter("TODOS"); setValorMin(""); setDiasAtrasoMin(""); }} className="px-2.5 py-1 text-xs rounded-md bg-secondary text-muted-foreground border border-border hover:text-foreground">Limpar filtros</button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Situação</label>
              <select value={situacaoMode} onChange={e => { const v = e.target.value as SituacaoMode; setSituacaoMode(v); if (v !== "ESPECIFICA") setSituacoesSelecionadas([]); }} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="TODOS">Todas</option>
                <option value="ATIVAS">Apenas Ativas (exclui Inativo, Cancelado, etc.)</option>
                <option value="ESPECIFICA">Situações específicas (selecione 1 ou mais)</option>
              </select>
            </div>
            {situacaoMode === "ESPECIFICA" && (
              <div className="sm:col-span-2">
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">
                  Quais situações <span className="text-muted-foreground/70 normal-case">(clique para marcar — pode escolher várias)</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_SITUACOES.map(s => {
                    const active = situacoesSelecionadas.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => toggleSituacao(s)}
                        className={`px-2.5 py-1 text-xs rounded-md border transition-all ${active ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-border hover:text-foreground"}`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Gestão</label>
              <select value={gestaoFilter} onChange={e => setGestaoFilter(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="TODOS">Todas</option>
                {gestaoOptions.map(g => <option key={g} value={g}>{g}</option>)}
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
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Região</label>
              <select value={regiaoFilter} onChange={e => setRegiaoFilter(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="TODOS">Todas</option>
                {regiaoOptions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Valor mensal mínimo (R$)</label>
              <input type="text" inputMode="decimal" value={valorMin} onChange={e => setValorMin(e.target.value)} placeholder="Ex.: 300" className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Dias em atraso mínimos</label>
              <input type="number" min={0} value={diasAtrasoMin} onChange={e => setDiasAtrasoMin(e.target.value)} placeholder="Ex.: 7, 30, 60…" className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30" />
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
            <span className="font-semibold text-foreground">{filtered.length}</span> cliente(s) serão exportados com essas configurações.
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
  ), document.body);
};

export default ClientesExcelExportModal;
