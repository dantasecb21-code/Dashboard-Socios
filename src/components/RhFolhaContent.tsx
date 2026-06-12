import { useMemo, useState } from "react";
import { useRhFolha } from "@/hooks/useRhFolha";
import { useRhSaidas } from "@/hooks/useRhSaidas";
import { useFinanceiro } from "@/hooks/useFinanceiro";
import { formatCurrencyBR } from "@/data/financeiro";
import KpiCard from "./KpiCard";
import {
  DollarSign, CheckCircle2, Clock, MessageSquare, Search, Filter, Download,
  Check, ChevronsUpDown, Wallet, Briefcase,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatDias, computeAtraso, type FolhaItem, type Categoria } from "@/services/rhFolhaService";
import { AlertTriangle, ArrowUpRight } from "lucide-react";
import RhFolhaExportModal from "./RhFolhaExportModal";

type CatFiltro = "TODOS" | Categoria;
type Preset = "TODOS" | "1A15" | "16A31" | "CUSTOM";

const PRESETS: { id: Preset; label: string; range: [number, number] | null }[] = [
  { id: "TODOS", label: "Mês inteiro", range: null },
  { id: "1A15", label: "Dia 1 – 15", range: [1, 15] },
  { id: "16A31", label: "Dia 16 – 31", range: [16, 31] },
  { id: "CUSTOM", label: "Personalizado", range: null },
];

const RhFolhaContent = () => {
  const { data, isLoading } = useRhFolha();
  const { data: saidasData } = useRhSaidas();
  const { data: finData } = useFinanceiro();
  const saldoAtual = finData?.saldoAtual ?? 0;
  const items: FolhaItem[] = useMemo(() => {
    const main = data?.items ?? [];
    const saidas = saidasData?.items?.filter((i) => i.categoria === "SAIDA") ?? [];
    // saidasData é a fonte autoritativa para SAIDA (staleTime menor, fetch dedicado)
    // Mantém FOLHA/VARIAVEL do fetch completo e substitui SAIDA pelo fetch rápido
    if (saidas.length === 0) return main;
    return [...main.filter((i) => i.categoria !== "SAIDA"), ...saidas];
  }, [data, saidasData]);
  const meses: string[] = data?.meses ?? saidasData?.meses ?? [];

  const [busca, setBusca] = useState("");
  const [filtroMeses, setFiltroMeses] = useState<string[]>([]);
  const [filtroSetores, setFiltroSetores] = useState<string[]>([]);
  const [setorPickerOpen, setSetorPickerOpen] = useState(false);
  const [filtroPago, setFiltroPago] = useState<"TODOS" | "PAGO" | "NAO">("TODOS");
  const [filtroCat, setFiltroCat] = useState<CatFiltro>("VARIAVEL");
  const [filtroMesAno, setFiltroMesAno] = useState<number[]>([]);
  const [mesAnoPickerOpen, setMesAnoPickerOpen] = useState(false);
  const [preset, setPreset] = useState<Preset>("TODOS");
  const [diaIni, setDiaIni] = useState<number>(1);
  const [diaFim, setDiaFim] = useState<number>(31);
  const [mesPickerOpen, setMesPickerOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const isSaida = filtroCat === "SAIDA";

  const periodo: [number, number] | null = useMemo(() => {
    if (preset === "TODOS") return null;
    if (preset === "CUSTOM") return [Math.max(1, diaIni), Math.min(31, diaFim)];
    return PRESETS.find(p => p.id === preset)?.range ?? null;
  }, [preset, diaIni, diaFim]);

  const itensDaCat = useMemo(
    () => filtroCat === "TODOS" ? items : items.filter(i => i.categoria === filtroCat),
    [items, filtroCat]
  );

  const setores = useMemo(() => {
    const s = new Set<string>();
    itensDaCat.forEach(i => { if (i.setor) s.add(i.setor); });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [itensDaCat]);

  const MESES_NOMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const parseMesFromData = (s: string): number | null => {
    if (!s) return null;
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return parseInt(iso[2], 10) - 1;
    const br = s.match(/\b\d{1,2}\/(\d{1,2})/);
    if (br) { const m = parseInt(br[1], 10) - 1; if (m >= 0 && m <= 11) return m; }
    return null;
  };

  const mesesAnoDisponiveis = useMemo(() => {
    const s = new Set<number>();
    itensDaCat.forEach(i => { const m = parseMesFromData(i.dataDisplay); if (m !== null) s.add(m); });
    return Array.from(s).sort((a, b) => a - b);
  }, [itensDaCat]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return items.filter((i) => {
      if (filtroCat !== "TODOS" && i.categoria !== filtroCat) return false;
      if (!isSaida && filtroMeses.length > 0 && !filtroMeses.includes(i.mes)) return false;
      if (isSaida && filtroMesAno.length > 0) {
        const m = parseMesFromData(i.dataDisplay);
        if (m === null || !filtroMesAno.includes(m)) return false;
      }
      if (filtroSetores.length > 0 && !filtroSetores.includes(i.setor)) return false;
      if (filtroPago !== "TODOS" && i.pago !== filtroPago) return false;
      if (periodo) {
        const [a, b] = periodo;
        const ok = i.dias.length === 0 ? false : i.dias.some(d => d >= a && d <= b);
        if (!ok) return false;
      }
      if (q) {
        const hay = `${i.nome} ${i.setor} ${i.contato} ${i.obs ?? ""} ${i.mes}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, busca, filtroMeses, filtroSetores, filtroPago, filtroCat, periodo, filtroMesAno, isSaida]);

  const now = useMemo(() => new Date(), []);

  const enriched = useMemo(
    () => filtrados.map((i) => ({ ...i, _atraso: computeAtraso(i, now) })),
    [filtrados, now]
  );

  const kpis = useMemo(() => {
    let total = 0, pago = 0, aPagar = 0, fixo = 0, variavel = 0, saidasSocios = 0, atrasado = 0, qtdAtrasado = 0;
    enriched.forEach((i) => {
      total += i.valor;
      if (i.pago === "PAGO") pago += i.valor; else aPagar += i.valor;
      if (i.categoria === "FOLHA") fixo += i.valor;
      else if (i.categoria === "VARIAVEL") variavel += i.valor;
      else saidasSocios += i.valor;
      if (i._atraso.atrasado) { atrasado += i.valor; qtdAtrasado++; }
    });
    return { total, pago, aPagar, fixo, variavel, saidasSocios, atrasado, qtdAtrasado, qtd: enriched.length };
  }, [enriched]);

  const handleExport = () => setExportOpen(true);

  if (isLoading && items.length === 0) {
    return <div className="text-muted-foreground text-sm">Carregando folha...</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <KpiCard title="Total" value={formatCurrencyBR(kpis.total)} subtitle={`${kpis.qtd} itens`} icon={DollarSign} variant="default" delay={0} />
        <KpiCard title="Custo Fixo (Folha)" value={formatCurrencyBR(kpis.fixo)} subtitle="Salários" icon={Briefcase} variant="info" delay={1} />
        <KpiCard title="Variável" value={formatCurrencyBR(kpis.variavel)} subtitle="Demais contas" icon={Wallet} variant="default" delay={2} />
        <KpiCard title="Pago" value={formatCurrencyBR(kpis.pago)} subtitle={`${kpis.total > 0 ? Math.round((kpis.pago / kpis.total) * 100) : 0}%`} icon={CheckCircle2} variant="success" delay={3} />
        <KpiCard title="A Pagar" value={formatCurrencyBR(kpis.aPagar)} subtitle="Pendente" icon={Clock} variant="info" delay={4} />
        <KpiCard title="Atrasado" value={formatCurrencyBR(kpis.atrasado)} subtitle={`${kpis.qtdAtrasado} item(ns)`} icon={AlertTriangle} variant="destructive" delay={5} />
        <KpiCard title="Saídas Sócios" value={formatCurrencyBR(kpis.saidasSocios)} subtitle="Gastos dos sócios" icon={ArrowUpRight} variant="destructive" delay={6} />
      </div>

      {/* KPIs Saldo Atual + Falta de Receita */}
      <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
        <KpiCard
          title="Saldo Atual"
          value={formatCurrencyBR(saldoAtual)}
          subtitle="COST TOTAL — linha 25"
          icon={Wallet}
          variant="success"
          delay={7}
        />
        <KpiCard
          title="Falta de Receita"
          value={formatCurrencyBR(kpis.aPagar - saldoAtual)}
          subtitle={`A Pagar (${formatCurrencyBR(kpis.aPagar)}) − Saldo Atual`}
          icon={Clock}
          variant={kpis.aPagar - saldoAtual > 0 ? "destructive" : "success"}
          delay={8}
        />
      </div>


      {/* Filtros */}
      <section className="glass-card p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-heading font-bold text-lg flex-1">Folha & Contas</h3>

          {/* Categoria */}
          <div className="inline-flex rounded-lg border border-border bg-background/40 p-0.5">
            {(["TODOS", "FOLHA", "VARIAVEL", "SAIDA"] as CatFiltro[]).map((c) => (
              <button
                key={c}
                onClick={() => setFiltroCat(c)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                  filtroCat === c
                    ? c === "SAIDA" ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
                    : c === "SAIDA" ? "text-destructive hover:text-destructive/80" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {c === "TODOS" ? "Tudo" : c === "FOLHA" ? "Custo Fixo" : c === "VARIAVEL" ? "Variável" : "Saídas Sócios"}
              </button>
            ))}
          </div>

          {/* Busca */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar nome, setor, contato..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background/40 text-sm w-56 focus:outline-none focus:border-primary/40"
            />
          </div>

          {/* Mês — para SAIDA usa mês do ano (Jan..Dez); senão usa aba */}
          {isSaida ? (
            <Popover open={mesAnoPickerOpen} onOpenChange={setMesAnoPickerOpen}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background/40 text-sm hover:border-primary/40">
                  <Filter className="w-3.5 h-3.5" />
                  <span>{filtroMesAno.length === 0 ? "Todos os meses" : filtroMesAno.length === 1 ? MESES_NOMES[filtroMesAno[0]] : `${filtroMesAno.length} meses`}</span>
                  <ChevronsUpDown className="w-3 h-3 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-0" align="end">
                <Command>
                  <CommandList>
                    <CommandEmpty>Nenhum.</CommandEmpty>
                    {filtroMesAno.length > 0 && (
                      <CommandGroup>
                        <CommandItem onSelect={() => setFiltroMesAno([])}>
                          <span className="text-muted-foreground text-xs ml-6">Limpar seleção</span>
                        </CommandItem>
                      </CommandGroup>
                    )}
                    <CommandGroup>
                      {(mesesAnoDisponiveis.length ? mesesAnoDisponiveis : MESES_NOMES.map((_, i) => i)).map((m) => {
                        const sel = filtroMesAno.includes(m);
                        return (
                          <CommandItem
                            key={m}
                            onSelect={() => setFiltroMesAno((prev) => sel ? prev.filter(x => x !== m) : [...prev, m])}
                          >
                            <Check className={cn("mr-2 h-4 w-4", sel ? "opacity-100" : "opacity-0")} />
                            {MESES_NOMES[m]}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          ) : (
            <Popover open={mesPickerOpen} onOpenChange={setMesPickerOpen}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background/40 text-sm hover:border-primary/40">
                  <Filter className="w-3.5 h-3.5" />
                  <span>{filtroMeses.length === 0 ? "Todos os meses" : `${filtroMeses.length} mês(es)`}</span>
                  <ChevronsUpDown className="w-3 h-3 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="end">
                <Command>
                  <CommandInput placeholder="Filtrar mês/aba..." />
                  <CommandList>
                    <CommandEmpty>Nenhum.</CommandEmpty>
                    <CommandGroup>
                      {meses.map((m) => {
                        const sel = filtroMeses.includes(m);
                        return (
                          <CommandItem
                            key={m}
                            onSelect={() => setFiltroMeses((prev) => sel ? prev.filter(x => x !== m) : [...prev, m])}
                          >
                            <Check className={cn("mr-2 h-4 w-4", sel ? "opacity-100" : "opacity-0")} />
                            {m}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}

          {/* Setor */}
          <Popover open={setorPickerOpen} onOpenChange={setSetorPickerOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background/40 text-sm hover:border-primary/40">
                <Briefcase className="w-3.5 h-3.5" />
                <span>{filtroSetores.length === 0 ? (isSaida ? "Todos sócios" : "Todos setores") : isSaida ? `${filtroSetores.length} sócio(s)` : `${filtroSetores.length} setor(es)`}</span>
                <ChevronsUpDown className="w-3 h-3 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="end">
              <Command>
                <CommandInput placeholder="Filtrar setor..." />
                <CommandList>
                  <CommandEmpty>Nenhum.</CommandEmpty>
                  {filtroSetores.length > 0 && (
                    <CommandGroup>
                      <CommandItem onSelect={() => setFiltroSetores([])}>
                        <span className="text-muted-foreground text-xs ml-6">Limpar seleção</span>
                      </CommandItem>
                    </CommandGroup>
                  )}
                  <CommandGroup>
                    {setores.map((s) => {
                      const sel = filtroSetores.includes(s);
                      return (
                        <CommandItem
                          key={s}
                          onSelect={() => setFiltroSetores((prev) => sel ? prev.filter(x => x !== s) : [...prev, s])}
                        >
                          <Check className={cn("mr-2 h-4 w-4", sel ? "opacity-100" : "opacity-0")} />
                          {s}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Pago */}
          <select
            value={filtroPago}
            onChange={(e) => setFiltroPago(e.target.value as "TODOS" | "PAGO" | "NAO")}
            className="px-3 py-1.5 rounded-lg border border-border bg-background/40 text-sm focus:outline-none focus:border-primary/40"
          >
            <option value="TODOS">Todos status</option>
            <option value="PAGO">Pago</option>
            <option value="NAO">Não pago</option>
          </select>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm hover:bg-primary/20"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar
          </button>
        </div>

        {/* Período por dia do mês */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground mr-1">Período do mês:</span>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              className={cn(
                "px-3 py-1 text-xs rounded-md border transition-colors",
                preset === p.id
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "bg-background/40 border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
          {preset === "CUSTOM" && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="number"
                min={1}
                max={31}
                value={diaIni}
                onChange={(e) => setDiaIni(parseInt(e.target.value || "1", 10))}
                className="w-16 px-2 py-1 rounded border border-border bg-background/40 text-xs"
              />
              <span className="text-xs text-muted-foreground">até</span>
              <input
                type="number"
                min={1}
                max={31}
                value={diaFim}
                onChange={(e) => setDiaFim(parseInt(e.target.value || "31", 10))}
                className="w-16 px-2 py-1 rounded border border-border bg-background/40 text-xs"
              />
            </div>
          )}
        </div>
      </section>

      {/* Tabela */}
      <section className="glass-card p-4">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Categoria</th>
                <th className="text-left px-3 py-2">Mês</th>
                <th className="text-center px-3 py-2">Dia</th>
                <th className="text-left px-3 py-2">Nome</th>
                <th className="text-left px-3 py-2">Setor</th>
                <th className="text-right px-3 py-2">Valor</th>
                <th className="text-center px-3 py-2">Pago</th>
                <th className="text-center px-3 py-2">Obs</th>
              </tr>
            </thead>
            <tbody>
              {enriched.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">
                  {items.length === 0 ? "Nenhum dado carregado. Verifique o deploy do Apps Script (acesso 'Qualquer pessoa')." : "Nenhum registro com esses filtros."}
                </td></tr>
              ) : (
                <TooltipProvider delayDuration={150}>
                  {enriched.map((r) => (
                    <tr
                      key={r.rowKey}
                      className={cn(
                        "border-t border-border hover:bg-muted/20 transition-colors",
                        r._atraso.atrasado && "bg-destructive/5",
                        !r._atraso.atrasado && r.obs && "bg-warning/5"
                      )}
                    >
                      <td className="px-3 py-2">
                        <span className={cn(
                          "inline-block px-2 py-0.5 rounded text-[10px] font-bold border",
                          r.categoria === "FOLHA"
                            ? "bg-info/15 text-info border-info/30"
                            : r.categoria === "SAIDA"
                              ? "bg-destructive/15 text-destructive border-destructive/30"
                            : "bg-muted/30 text-muted-foreground border-border"
                        )}>
                          {r.categoria === "FOLHA" ? "FIXO" : r.categoria === "SAIDA" ? "SAÍDA" : "VAR"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{r.mes}</td>
                      <td className="px-3 py-2 text-center text-xs tabular-nums">
                        <div>{r.dataDisplay?.trim() || formatDias(r.dias)}</div>
                        {r._atraso.atrasado && (
                          <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-destructive/15 text-destructive border border-destructive/30">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {r._atraso.diasAtraso}d atraso
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 font-medium">{r.nome}</td>
                      <td className="px-3 py-2 text-xs">{r.setor}</td>
                      <td className={cn("px-3 py-2 text-right tabular-nums", r.categoria === "SAIDA" && "text-destructive font-semibold")}>{r.valorDisplay || formatCurrencyBR(r.valor)}</td>
                      <td className="px-3 py-2 text-center">
                        {r.pago === "PAGO" ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-success/15 text-success border border-success/30">PAGO</span>
                        ) : r._atraso.atrasado ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-destructive/15 text-destructive border border-destructive/30">ATRASADO</span>
                        ) : r.pago === "NAO" ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-warning/15 text-warning border border-warning/30">PENDENTE</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {r.obs ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="text-warning hover:text-warning/80">
                                <MessageSquare className="w-4 h-4 inline" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-sm whitespace-pre-line text-xs leading-relaxed">
                              {r.obs}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </TooltipProvider>
              )}
            </tbody>
            {filtrados.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/20 font-bold">
                  <td colSpan={5} className="px-3 py-2 text-right text-xs uppercase tracking-wider">Total filtrado</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatCurrencyBR(kpis.total)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>


      <RhFolhaExportModal open={exportOpen} onClose={() => setExportOpen(false)} rows={filtrados} />
    </div>
  );
};

export default RhFolhaContent;
