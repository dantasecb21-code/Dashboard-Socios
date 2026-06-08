import { Fragment, memo, useMemo, useState } from "react";
import { Search, Filter, ChevronDown, ChevronUp, Info, FileSpreadsheet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FinanceiroClient, formatCurrencyBR, getValorAtrasoEfetivo, isClienteEmAtraso } from "@/data/financeiro";
import { getStatusColor } from "@/data/clients";
import ClientesExcelExportModal from "./ClientesExcelExportModal";

const statusBadgeStyles: Record<string, string> = {
  success: "bg-success/15 text-success border-success/25",
  warning: "bg-warning/15 text-warning border-warning/25",
  destructive: "bg-destructive/15 text-destructive border-destructive/25",
  muted: "bg-muted text-muted-foreground border-border",
  secondary: "bg-secondary text-secondary-foreground border-border",
  info: "bg-info/15 text-info border-info/25",
};

export interface ClientTableRow extends FinanceiroClient {
  gestor?: string;
}

type Props = { clients: ClientTableRow[] };

const DetailRow = memo(({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</span>
    <span className="text-sm text-foreground">{value || "—"}</span>
  </div>
));

DetailRow.displayName = "DetailRow";

const INACTIVE_STATUSES = ["INATIVO", "CANCELADO", "EM CANCELAMENTO", "EM CANCELAMENTO/ATRASADO", "EM CANCELAMENTO/PAGO", "PAUSADO"];

const ClientTable = ({ clients }: Props) => {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("TODOS");
  const [filterServico, setFilterServico] = useState("TODOS");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [excelOpen, setExcelOpen] = useState(false);

  const statuses = useMemo(() => ["TODOS", "ATIVAS", ...Array.from(new Set(clients.map(c => c.situacao)))], [clients]);
  const servicos = useMemo(
    () => ["TODOS", ...Array.from(new Set(clients.map(c => (c.gestao || "").trim()).filter(Boolean))).sort()],
    [clients]
  );

  const filtered = useMemo(() => clients.filter(c => {
    const s = search.toLowerCase();
    const matchSearch =
      c.empresa.toLowerCase().includes(s) ||
      c.cliente.toLowerCase().includes(s) ||
      c.razaoSocial.toLowerCase().includes(s) ||
      c.cnpj.toLowerCase().includes(s) ||
      c.gestao.toLowerCase().includes(s) ||
      (c.gestor || "").toLowerCase().includes(s) ||
      c.id.toLowerCase().includes(s);
    const situacaoUpper = (c.situacao || "").toUpperCase();
    const matchStatus =
      filterStatus === "TODOS" ||
      (filterStatus === "ATIVAS" && !INACTIVE_STATUSES.includes(situacaoUpper)) ||
      c.situacao === filterStatus;
    const matchServico = filterServico === "TODOS" || (c.gestao || "").trim() === filterServico;
    return matchSearch && matchStatus && matchServico;
  }), [clients, filterStatus, filterServico, search]);

  const visibleRows = useMemo(() => filtered.slice(0, 120), [filtered]);

  const isAtrasoFilter = filterStatus.toUpperCase().includes("ATRAS");
  const totalValor = filtered.reduce((acc, c) => acc + (c.valorFixo || 0), 0);
  const totalAtrasado = filtered.filter(isClienteEmAtraso).reduce((acc, c) => acc + getValorAtrasoEfetivo(c), 0);

  return (
    <div className="glass-card p-3 sm:p-4 lg:p-5 opacity-0 animate-fade-in" style={{ animationDelay: "0.4s" }}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-5">
        <div>
          <h3 className="font-heading font-bold text-foreground text-sm">Clientes</h3>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
            {filtered.length} resultados
            <span className="mx-1.5 text-border">•</span>
            <span className="text-foreground font-semibold tabular-nums">{formatCurrencyBR(totalValor)}</span>
            <span className="text-muted-foreground"> em mensalidade</span>
            {isAtrasoFilter && totalAtrasado > 0 && (
              <>
                <span className="mx-1.5 text-border">•</span>
                <span className="text-destructive font-semibold tabular-nums">{formatCurrencyBR(totalAtrasado)}</span>
                <span className="text-muted-foreground"> em atraso</span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial sm:w-56 lg:w-64">
            <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={13} />
            <Input
              placeholder="Buscar empresa, CNPJ, gestor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 sm:pl-9 h-8 sm:h-9 bg-secondary border-border text-xs sm:text-sm rounded-lg"
            />
          </div>
          <div className="relative flex items-center gap-1">
            <Filter className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={12} />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-8 sm:h-9 pl-7 sm:pl-8 pr-2 sm:pr-3 rounded-lg bg-secondary border border-border text-xs sm:text-sm text-foreground font-bold outline-none appearance-none cursor-pointer max-w-[120px] sm:max-w-none"
            >
              {statuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="O que significa ATIVAS?"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Info size={14} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="end" className="max-w-[240px] text-xs">
                  <p className="font-semibold mb-1">Filtro ATIVAS</p>
                  <p className="text-muted-foreground">
                    Mostra todos os clientes em operação, exceto:
                    <br />• INATIVO
                    <br />• CANCELADO
                    <br />• EM CANCELAMENTO
                    <br />• PAUSADO
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="relative">
            <Filter className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={12} />
            <select
              value={filterServico}
              onChange={(e) => setFilterServico(e.target.value)}
              title="Filtrar por serviço (gestão)"
              className="h-8 sm:h-9 pl-7 sm:pl-8 pr-2 sm:pr-3 rounded-lg bg-secondary border border-border text-xs sm:text-sm text-foreground font-bold outline-none appearance-none cursor-pointer max-w-[140px] sm:max-w-[180px]"
            >
              {servicos.map(s => (
                <option key={s} value={s}>{s === "TODOS" ? "Serviço: todos" : s}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setExcelOpen(true)}
            title="Exportar para Excel com filtros (atrasados, ativos, etc.)"
            className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-lg bg-success text-success-foreground hover:bg-success/90 text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <FileSpreadsheet size={13} />
            <span className="hidden sm:inline">Excel</span>
          </button>
        </div>
      </div>

      <ClientesExcelExportModal open={excelOpen} onClose={() => setExcelOpen(false)} clients={clients} />

      {/* Mobile: Card layout */}
      <div className="block sm:hidden space-y-2">
        {visibleRows.map((c, i) => {
          const color = getStatusColor(c.situacao);
          const isExpanded = expandedRow === i;
          return (
            <div
              key={`mobile-${c.empresa}-${c.gestao}-${i}`}
              className="border border-border/40 rounded-lg p-3 bg-secondary/20"
              onClick={() => setExpandedRow(isExpanded ? null : i)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground truncate">{c.empresa}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {c.gestao} • {c.gestor ? `Gestor: ${c.gestor}` : c.cliente}
                  </p>
                </div>
                <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0 ${statusBadgeStyles[color]}`}>
                  {c.situacao}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-foreground tabular-nums">{formatCurrencyBR(c.valorFixo)}</span>
                  <span className="text-[10px] text-muted-foreground">{c.regiao}</span>
                </div>
                {isExpanded ? <ChevronUp size={12} className="text-muted-foreground" /> : <ChevronDown size={12} className="text-muted-foreground" />}
              </div>
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-border/30 grid grid-cols-2 gap-x-4 gap-y-2">
                  <DetailRow label="ID" value={c.id} />
                  <DetailRow label="Gestor" value={c.gestor || "—"} />
                  <DetailRow label="Entrada" value={c.entrada} />
                  <DetailRow label="Últ. Pagamento" value={c.ultimoPagamento} />
                  <DetailRow label="Fidelidade" value={c.fidelidade} />
                  <DetailRow label="Contrato" value={c.contrato} />
                  <DetailRow label="Plano" value={c.plano} />
                  <DetailRow label="Closer" value={c.closer} />
                  <DetailRow label="Email" value={c.email} />
                  <DetailRow label="Telefone" value={c.telefone} />
                  <DetailRow label="Razão Social" value={c.razaoSocial} />
                  <DetailRow label="CNPJ" value={c.cnpj} />
                  <DetailRow label="Dias Atraso" value={c.diasAtraso > 0 ? String(c.diasAtraso) : "—"} />
                  <DetailRow label="Valor Atrasado" value={c.valorAtrasado > 0 ? formatCurrencyBR(c.valorAtrasado) : "—"} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop: Table layout */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {["", "ID", "Empresa", "Situação", "Valor", "Gestão", "Gestor", "Cliente", "Região"].map(h => (
                <th key={h} className="text-left py-2 px-2 lg:px-3 text-[10px] lg:text-[11px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((c, i) => {
              const color = getStatusColor(c.situacao);
              const isExpanded = expandedRow === i;
              return (
                <Fragment key={`client-${c.id || c.empresa}-${c.gestao}-${i}`}>
                  <tr
                    key={`row-${c.empresa}-${c.gestao}-${i}`}
                    onClick={() => setExpandedRow(isExpanded ? null : i)}
                    className="border-b border-border/40 hover:bg-secondary/40 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-2 lg:px-3 text-muted-foreground">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </td>
                    <td className="py-2.5 px-2 lg:px-3 text-muted-foreground font-mono text-[10px] lg:text-xs">{c.id}</td>
                    <td className="py-2.5 px-2 lg:px-3 font-medium text-foreground max-w-[140px] lg:max-w-[200px] truncate text-xs lg:text-sm">{c.empresa}</td>
                    <td className="py-2.5 px-2 lg:px-3">
                      <span className={`inline-flex px-1.5 lg:px-2 py-0.5 rounded-md text-[9px] lg:text-[11px] font-bold border whitespace-nowrap ${statusBadgeStyles[color]}`}>
                        {c.situacao}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 lg:px-3 text-foreground font-medium tabular-nums text-xs lg:text-sm whitespace-nowrap">{formatCurrencyBR(c.valorFixo)}</td>
                    <td className="py-2.5 px-2 lg:px-3 text-secondary-foreground text-xs lg:text-sm">{c.gestao}</td>
                    <td className="py-2.5 px-2 lg:px-3 text-secondary-foreground text-xs lg:text-sm">{c.gestor || "—"}</td>
                    <td className="py-2.5 px-2 lg:px-3 text-secondary-foreground text-xs lg:text-sm max-w-[100px] lg:max-w-none truncate">{c.cliente}</td>
                    <td className="py-2.5 px-2 lg:px-3 text-muted-foreground text-xs">{c.regiao}</td>
                  </tr>
                  {isExpanded && (
                    <tr key={`detail-${c.empresa}-${c.gestao}-${i}`} className="border-b border-border/40">
                      <td colSpan={9} className="py-3 px-4 lg:px-6 bg-secondary/30">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 lg:gap-x-6 gap-y-2 lg:gap-y-3">
                          <DetailRow label="Entrada" value={c.entrada} />
                          <DetailRow label="Últ. Pagamento" value={c.ultimoPagamento} />
                          <DetailRow label="Dias Atraso" value={c.diasAtraso > 0 ? String(c.diasAtraso) : "—"} />
                          <DetailRow label="Qtd. Meses (LTV)" value={c.qtdMeses > 0 ? String(c.qtdMeses) : "—"} />
                          <DetailRow label="Fidelidade" value={c.fidelidade} />
                          <DetailRow label="Contrato" value={c.contrato} />
                          <DetailRow label="Plano" value={c.plano} />
                          <DetailRow label="Forma Pagamento" value={c.formaPagamento} />
                          <DetailRow label="Closer" value={c.closer} />
                          <DetailRow label="Agender" value={c.agender} />
                          <DetailRow label="Email" value={c.email} />
                          <DetailRow label="Telefone" value={c.telefone} />
                          <DetailRow label="Razão Social" value={c.razaoSocial} />
                          <DetailRow label="CNPJ" value={c.cnpj} />
                          <DetailRow label="Estado" value={c.estado} />
                          <DetailRow label="Valor Atrasado" value={c.valorAtrasado > 0 ? formatCurrencyBR(c.valorAtrasado) : "—"} />
                          <DetailRow label="Atrasado c/ Juros" value={c.atrasadoComJuros > 0 ? formatCurrencyBR(c.atrasadoComJuros) : "—"} />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {filtered.length > visibleRows.length && (
        <p className="text-center text-[10px] text-muted-foreground py-2">
          Mostrando {visibleRows.length} de {filtered.length} resultados. Refine a busca para ver mais.
        </p>
      )}
    </div>
  );
};

export default ClientTable;
