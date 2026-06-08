import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { exportToExcel, ExcelColumn } from "@/lib/excelExport";
import { FinanceiroClient, formatCurrencyBR } from "@/data/financeiro";

export type PrevisaoColumnKey =
  | "id" | "empresa" | "razaoSocial" | "cnpj" | "situacao" | "diaPagamento"
  | "valorFixo" | "valorAtrasado" | "atrasadoComJuros" | "diasAtraso"
  | "regiao" | "estado" | "cliente" | "gestao" | "closer" | "agender"
  | "telefone" | "email" | "plano" | "fidelidade" | "contrato"
  | "ultimoPagamento" | "qtdMeses" | "formaPagamento" | "entrada";

const COL_DEFS: Record<PrevisaoColumnKey, ExcelColumn<FinanceiroClient> & { label: string; pdfValue?: (r: FinanceiroClient) => string }> = {
  id: { header: "ID", label: "ID", value: r => r.id || "", width: 10 },
  empresa: { header: "Empresa", label: "Empresa", value: r => r.empresa, width: 28 },
  razaoSocial: { header: "Razão Social", label: "Razão Social", value: r => r.razaoSocial || "", width: 28 },
  cnpj: { header: "CNPJ", label: "CNPJ", value: r => r.cnpj || "", width: 18 },
  situacao: { header: "Situação", label: "Situação", value: r => r.situacao, width: 16 },
  diaPagamento: { header: "Dia Pgto", label: "Dia Pgto", value: r => r.diaPagamento, width: 10 },
  valorFixo: { header: "Valor Mensal", label: "Valor Mensal", value: r => r.valorFixo, width: 14, numFmt: '"R$" #,##0.00', pdfValue: r => formatCurrencyBR(r.valorFixo) },
  valorAtrasado: { header: "Valor Atrasado", label: "Valor Atrasado", value: r => r.valorAtrasado ?? 0, width: 14, numFmt: '"R$" #,##0.00', pdfValue: r => formatCurrencyBR(r.valorAtrasado ?? 0) },
  atrasadoComJuros: { header: "Atrasado c/ Juros", label: "Atrasado c/ Juros", value: r => r.atrasadoComJuros ?? 0, width: 16, numFmt: '"R$" #,##0.00', pdfValue: r => formatCurrencyBR(r.atrasadoComJuros ?? 0) },
  diasAtraso: { header: "Dias Atraso", label: "Dias Atraso", value: r => r.diasAtraso ?? 0, width: 10 },
  regiao: { header: "Região", label: "Região", value: r => r.regiao === "SP" ? "São Paulo" : "Salvador", width: 14 },
  estado: { header: "Estado", label: "Estado", value: r => r.estado || "", width: 10 },
  cliente: { header: "Cliente", label: "Cliente", value: r => r.cliente || "", width: 22 },
  gestao: { header: "Gestão", label: "Gestão", value: r => r.gestao || "", width: 16 },
  closer: { header: "Closer", label: "Closer", value: r => r.closer || "", width: 14 },
  agender: { header: "Agender", label: "Agender", value: r => r.agender || "", width: 14 },
  telefone: { header: "Telefone", label: "Telefone", value: r => r.telefone || "", width: 16 },
  email: { header: "Email", label: "Email", value: r => r.email || "", width: 26 },
  plano: { header: "Plano", label: "Plano", value: r => r.plano || "", width: 14 },
  fidelidade: { header: "Fidelidade", label: "Fidelidade", value: r => r.fidelidade || "", width: 12 },
  contrato: { header: "Contrato", label: "Contrato", value: r => r.contrato || "", width: 14 },
  ultimoPagamento: { header: "Último Pgto", label: "Último Pgto", value: r => r.ultimoPagamento || "", width: 14 },
  qtdMeses: { header: "Qtd. Meses (LTV)", label: "Qtd. Meses (LTV)", value: r => r.qtdMeses ?? 0, width: 12 },
  formaPagamento: { header: "Forma Pgto", label: "Forma Pgto", value: r => r.formaPagamento || "", width: 14 },
  entrada: { header: "Entrada", label: "Entrada", value: r => r.entrada || "", width: 12 },
};

const ALL_KEYS = Object.keys(COL_DEFS) as PrevisaoColumnKey[];
const DEFAULT_KEYS: PrevisaoColumnKey[] = ["empresa", "situacao", "diaPagamento", "valorFixo", "regiao", "cliente", "gestao", "closer"];

const ALL_SITUACOES = [
  "A PAGAR", "ACORDO", "ATRASADO", "ATRASO DO MÊS", "CANCELADO", "DEVOLUÇÃO",
  "EM CANCELAMENTO", "EM CANCELAMENTO/ATRASADO", "EM CANCELAMENTO/PAGO",
  "INATIVO", "NOVO CLIENTE", "NÃO COBRAR", "PAGO", "PAUSADO",
  "PENDÊNCIA", "SEM RESULTADO", "SINAL", "VALOR ATÉ O 5º DIA ÚTIL", "VALOR ATÉ O DIA 15",
];
const INACTIVE = ["INATIVO", "CANCELADO", "EM CANCELAMENTO", "EM CANCELAMENTO/ATRASADO", "EM CANCELAMENTO/PAGO", "PAUSADO"];
const ATRASO_LIST = ["ATRASADO", "ATRASO DO MÊS", "EM CANCELAMENTO/ATRASADO"];

type SituacaoMode = "TODOS" | "ATIVAS" | "ESPECIFICA";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** All clients (all regions) — modal handles all filtering */
  rows: FinanceiroClient[];
  region: string;
  diaInicio: number;
  diaFim: number;
  filtro: string;
  initialFormat?: "excel" | "pdf";
}

export default function PrevisaoExportModal({ open, onOpenChange, rows, region, diaInicio, diaFim, initialFormat = "excel" }: Props) {
  const [format, setFormat] = useState<"excel" | "pdf">(initialFormat);
  const [filename, setFilename] = useState("");
  const [selected, setSelected] = useState<PrevisaoColumnKey[]>(DEFAULT_KEYS);

  const initialRegion = region === "SÃO PAULO" ? "SP" : region === "SALVADOR" ? "SSA" : "TODAS";
  const [regiaoFilter, setRegiaoFilter] = useState<"TODAS" | "SP" | "SSA">(initialRegion as "TODAS" | "SP" | "SSA");
  const [situacaoMode, setSituacaoMode] = useState<SituacaoMode>("TODOS");
  const [situacoes, setSituacoes] = useState<string[]>([]);
  const [gestao, setGestao] = useState<string>("TODAS");
  const [gestor, setGestor] = useState<string>("TODOS");
  const [valorMin, setValorMin] = useState<string>("");
  const [diasMin, setDiasMin] = useState<string>("");
  const [diaIni, setDiaIni] = useState<number>(diaInicio);
  const [diaFin, setDiaFin] = useState<number>(diaFim);

  const gestoes = useMemo(() => Array.from(new Set(rows.map(c => c.gestao).filter(Boolean))).sort(), [rows]);
  const closers = useMemo(() => Array.from(new Set(rows.map(c => c.closer).filter(Boolean))).sort(), [rows]);

  const filtered = useMemo(() => {
    const lo = Math.min(diaIni, diaFin);
    const hi = Math.max(diaIni, diaFin);
    let r = rows;
    if (regiaoFilter !== "TODAS") r = r.filter(c => c.regiao === regiaoFilter);
    r = r.filter(c => c.diaPagamento >= lo && c.diaPagamento <= hi);
    if (situacaoMode === "ATIVAS") r = r.filter(c => !INACTIVE.includes((c.situacao || "").toUpperCase()));
    else if (situacaoMode === "ESPECIFICA" && situacoes.length > 0) r = r.filter(c => situacoes.includes((c.situacao || "").toUpperCase()));
    if (gestao !== "TODAS") r = r.filter(c => c.gestao === gestao);
    if (gestor !== "TODOS") r = r.filter(c => c.closer === gestor);
    const vm = parseFloat(valorMin.replace(/\./g, "").replace(",", "."));
    if (!isNaN(vm) && vm > 0) r = r.filter(c => (c.valorFixo || 0) >= vm);
    const dm = parseInt(diasMin, 10);
    if (!isNaN(dm) && dm > 0) r = r.filter(c => (c.diasAtraso || 0) >= dm);
    return [...r].sort((a, b) => a.diaPagamento - b.diaPagamento);
  }, [rows, regiaoFilter, diaIni, diaFin, situacaoMode, situacoes, gestao, gestor, valorMin, diasMin]);

  const toggleSit = (s: string) => setSituacoes(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const toggleCol = (k: PrevisaoColumnKey) => setSelected(s => s.includes(k) ? s.filter(x => x !== k) : [...s, k]);
  const allSelected = selected.length === ALL_KEYS.length;

  const tag = situacaoMode === "ATIVAS" ? "ativas"
    : situacaoMode === "ESPECIFICA" && situacoes.length > 0 ? situacoes.map(s => s.toLowerCase().replace(/\s+/g, "-")).join("_")
    : "";
  const baseName = filename.trim() || `previsao-receita-${regiaoFilter.toLowerCase()}-dia${Math.min(diaIni, diaFin)}-${Math.max(diaIni, diaFin)}${tag ? `-${tag}` : ""}`;

  const handleExport = async () => {
    const cols = selected.map(k => COL_DEFS[k]);
    if (cols.length === 0 || filtered.length === 0) return;

    if (format === "excel") {
      exportToExcel({ filename: baseName, sheetName: "Previsão", rows: filtered, columns: cols });
    } else {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(14);
      doc.text(`Previsão de Receita — ${regiaoFilter} (dia ${Math.min(diaIni, diaFin)} a ${Math.max(diaIni, diaFin)})`, 14, 14);
      doc.setFontSize(9);
      const total = filtered.reduce((s, c) => s + (c.valorFixo || 0), 0);
      doc.text(`${filtered.length} cliente(s) • Total: ${formatCurrencyBR(total)}`, 14, 20);
      autoTable(doc, {
        startY: 25,
        head: [cols.map(c => c.header)],
        body: filtered.map(r => cols.map(c => {
          const def = c as ExcelColumn<FinanceiroClient> & { pdfValue?: (r: FinanceiroClient) => string };
          return def.pdfValue ? def.pdfValue(r) : String(c.value(r) ?? "");
        })),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [100, 80, 220] },
      });
      doc.save(`${baseName}.pdf`);
    }
    onOpenChange(false);
  };

  const Chip = ({ active, onClick, color = "primary", children }: { active: boolean; onClick: () => void; color?: "primary" | "success" | "warning" | "destructive"; children: React.ReactNode }) => {
    const base = "px-2.5 py-1 text-xs rounded-md border transition-all";
    const colorMap = {
      primary: active ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-border hover:text-foreground",
      success: "bg-success/15 text-success border-success/30 hover:bg-success/25",
      warning: "bg-warning/15 text-warning border-warning/30 hover:bg-warning/25",
      destructive: "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/25",
    };
    return <button onClick={onClick} className={`${base} ${colorMap[color]}`}>{children}</button>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Personalizar exportação — Previsão de Receita</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Format */}
          <div className="flex gap-2">
            <button onClick={() => setFormat("excel")} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-sm font-semibold transition ${format === "excel" ? "bg-success/15 text-success border-success/40" : "bg-secondary border-border text-muted-foreground hover:bg-muted"}`}>
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
            <button onClick={() => setFormat("pdf")} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-sm font-semibold transition ${format === "pdf" ? "bg-destructive/15 text-destructive border-destructive/40" : "bg-secondary border-border text-muted-foreground hover:bg-muted"}`}>
              <FileText className="w-4 h-4" /> PDF
            </button>
          </div>

          {/* Atalhos */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Atalhos rápidos</label>
            <div className="flex flex-wrap gap-1.5">
              <Chip active={false} color="success" onClick={() => { setSituacaoMode("ATIVAS"); setSituacoes([]); setDiasMin(""); }}>Só Ativas</Chip>
              <Chip active={false} color="destructive" onClick={() => { setSituacaoMode("ESPECIFICA"); setSituacoes(ATRASO_LIST); }}>Atrasados (todos)</Chip>
              <Chip active={false} color="warning" onClick={() => { setSituacaoMode("ESPECIFICA"); setSituacoes(["ATRASO DO MÊS"]); }}>Atraso do Mês</Chip>
              <Chip active={false} color="warning" onClick={() => { setSituacaoMode("ESPECIFICA"); setSituacoes(["EM CANCELAMENTO"]); }}>Em Cancelamento</Chip>
              <Chip active={false} color="destructive" onClick={() => { setSituacaoMode("ESPECIFICA"); setSituacoes(["CANCELADO"]); }}>Cancelados</Chip>
              <Chip active={false} color="success" onClick={() => { setSituacaoMode("ESPECIFICA"); setSituacoes(["PAGO"]); }}>Pagos</Chip>
              <Chip active={false} onClick={() => { setSituacaoMode("TODOS"); setSituacoes([]); setGestao("TODAS"); setGestor("TODOS"); setRegiaoFilter("TODAS"); setValorMin(""); setDiasMin(""); setDiaIni(1); setDiaFin(31); }}>Limpar filtros</Chip>
            </div>
          </div>

          {/* Situação */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Situação</label>
            <select value={situacaoMode} onChange={e => { const v = e.target.value as SituacaoMode; setSituacaoMode(v); if (v !== "ESPECIFICA") setSituacoes([]); }} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="TODOS">Todas</option>
              <option value="ATIVAS">Apenas Ativas (exclui Inativo/Cancelado/Pausado)</option>
              <option value="ESPECIFICA">Situações específicas (selecione 1 ou mais)</option>
            </select>
            {situacaoMode === "ESPECIFICA" && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ALL_SITUACOES.map(s => (
                  <Chip key={s} active={situacoes.includes(s)} onClick={() => toggleSit(s)}>{s}</Chip>
                ))}
              </div>
            )}
          </div>

          {/* Gestão / Closer / Região */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Gestão</label>
              <select value={gestao} onChange={e => setGestao(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border">
                <option value="TODAS">Todas</option>
                {gestoes.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Closer</label>
              <select value={gestor} onChange={e => setGestor(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border">
                <option value="TODOS">Todos</option>
                {closers.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Região</label>
              <select value={regiaoFilter} onChange={e => setRegiaoFilter(e.target.value as "TODAS" | "SP" | "SSA")} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border">
                <option value="TODAS">Todas</option>
                <option value="SP">São Paulo</option>
                <option value="SSA">Salvador</option>
              </select>
            </div>
          </div>

          {/* Valor / Dias atraso */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Valor mensal mínimo (R$)</label>
              <Input value={valorMin} onChange={e => setValorMin(e.target.value)} placeholder="Ex.: 300" />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Dias em atraso mínimos</label>
              <Input type="number" min={0} value={diasMin} onChange={e => setDiasMin(e.target.value)} placeholder="Ex.: 7, 30, 60..." />
            </div>
          </div>

          {/* Dia pagamento */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Dia de pagamento (período)</label>
            <div className="flex flex-wrap items-center gap-1.5">
              {[[1,5],[1,10],[1,15],[16,20],[16,25],[16,31],[1,31]].map(([a,b]) => (
                <Chip key={`${a}-${b}`} active={diaIni === a && diaFin === b} onClick={() => { setDiaIni(a); setDiaFin(b); }}>
                  {a === 1 && b === 31 ? "Mês todo" : `${String(a).padStart(2,"0")}-${String(b).padStart(2,"0")}`}
                </Chip>
              ))}
              <span className="text-xs text-muted-foreground ml-2">Dia</span>
              <Input type="number" min={1} max={31} value={diaIni} onChange={e => setDiaIni(Math.max(1, Math.min(31, Number(e.target.value) || 1)))} className="w-16 h-8" />
              <span className="text-xs text-muted-foreground">até</span>
              <Input type="number" min={1} max={31} value={diaFin} onChange={e => setDiaFin(Math.max(1, Math.min(31, Number(e.target.value) || 1)))} className="w-16 h-8" />
            </div>
          </div>

          {/* Filename */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome do arquivo</label>
            <Input value={filename} onChange={e => setFilename(e.target.value)} placeholder={baseName} className="mt-1" />
          </div>

          {/* Columns */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Colunas ({selected.length}/{ALL_KEYS.length})</label>
              <button onClick={() => setSelected(allSelected ? DEFAULT_KEYS : ALL_KEYS)} className="text-xs text-primary hover:underline">
                {allSelected ? "Padrão" : "Selecionar todas"}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-auto p-2 rounded-md border border-border bg-muted/20">
              {ALL_KEYS.map(k => (
                <label key={k} className="flex items-center gap-2 text-sm cursor-pointer hover:text-foreground">
                  <Checkbox checked={selected.includes(k)} onCheckedChange={() => toggleCol(k)} />
                  <span>{COL_DEFS[k].label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-muted/40 border border-border px-3 py-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{filtered.length}</span> cliente(s) serão exportados • Total: <span className="font-semibold text-foreground">{formatCurrencyBR(filtered.reduce((s, c) => s + (c.valorFixo || 0), 0))}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleExport} disabled={selected.length === 0 || filtered.length === 0} className="gap-2">
            <Download className="w-4 h-4" /> Baixar {format === "excel" ? "Excel" : "PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
