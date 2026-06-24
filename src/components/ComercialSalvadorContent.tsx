import { useMemo, useState } from "react";
import { useComercialSalvador } from "@/hooks/useComercialSalvador";
import { STATUS_LABELS, STATUS_COLORS, AgendamentoStatus } from "@/services/comercialSalvadorService";
import KpiCard from "./KpiCard";
import { formatCurrencyBR } from "@/data/financeiro";
import {
  CalendarCheck, Users, XCircle, TrendingUp, Filter,
  Check, ChevronsUpDown, ChevronDown, ShoppingBag, Award,
  CalendarDays, BarChart2, DollarSign,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

const STATUS_ORDER: AgendamentoStatus[] = ["reuniao_feita", "venda_feita", "em_atendimento_closer", "a_fazer", "cancelado"];

type FiltroPeriodo = "TODOS" | "DIARIO" | "MES" | "DIA";
type AbaAtiva = "agendamentos" | "vendas" | "resumo" | "performance";

const todayStr = () => new Date().toISOString().slice(0, 10);
const currentMonthStr = () => new Date().toISOString().slice(0, 7);

const ComercialSalvadorContent = () => {
  const { data, isLoading } = useComercialSalvador();

  // Sub-tabs
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>("agendamentos");

  // Period filter
  const [filtroPeriodo, setFiltroPeriodo] = useState<FiltroPeriodo>("TODOS");
  const [filtroMes, setFiltroMes] = useState(currentMonthStr);
  const [filtroDataEsp, setFiltroDataEsp] = useState(todayStr);

  // Existing filters (agendamentos)
  const [filtroAgender, setFiltroAgender] = useState<string>("TODOS");
  const [filtroCloser, setFiltroCloser] = useState<string>("TODOS");
  const [filtroStatus, setFiltroStatus] = useState<AgendamentoStatus | "TODOS">("TODOS");
  const [filtroProduto, setFiltroProduto] = useState<string>("TODOS");
  const [busca, setBusca] = useState("");
  const [tabelaOpen, setTabelaOpen] = useState(true);
  const [agenderPickerOpen, setAgenderPickerOpen] = useState(false);
  const [closerPickerOpen, setCloserPickerOpen] = useState(false);

  // Filtros da tabela Vendas Realizadas
  const [buscaVendas, setBuscaVendas] = useState("");
  const [filtroClosersVendas, setFiltroClosersVendas] = useState<string[]>([]);
  const [filtroAgendersVendas, setFiltroAgendersVendas] = useState<string[]>([]);
  const [filtroProdutosVendas, setFiltroProdutosVendas] = useState<string[]>([]);
  const [filtroResultadosVendas, setFiltroResultadosVendas] = useState<string[]>([]);
  const [filtroStatusVendas, setFiltroStatusVendas] = useState<"TODOS" | "ATIVAS" | "CANCELADAS">("TODOS");
  const [closerVendasOpen, setCloserVendasOpen] = useState(false);
  const [agenderVendasOpen, setAgenderVendasOpen] = useState(false);
  const [produtoVendasOpen, setProdutoVendasOpen] = useState(false);
  const [resultadoVendasOpen, setResultadoVendasOpen] = useState(false);

  const registros = data?.registros ?? [];
  const vendasTab = data?.vendasTab ?? [];
  const resumoDiarioTab = data?.resumoDiarioTab ?? [];
  const performanceTab = data?.performanceTab ?? [];

  const agenders = useMemo(() => {
    const s = new Set<string>();
    registros.forEach(r => { if (r.agender?.trim()) s.add(r.agender.trim()); });
    return Array.from(s).sort();
  }, [registros]);

  const closers = useMemo(() => {
    const s = new Set<string>();
    registros.forEach(r => { if (r.closer?.trim()) s.add(r.closer.trim()); });
    return Array.from(s).sort();
  }, [registros]);

  const produtos = useMemo(() => {
    const s = new Set<string>();
    registros.forEach(r => { if (r.produto?.trim()) s.add(r.produto.trim()); });
    return Array.from(s).sort();
  }, [registros]);

  // Agendamentos: filtro de período + campos
  const filtradosPeriodo = useMemo(() => {
    const today = todayStr();
    return registros.filter(r => {
      const d = r.dataReuniao || r.dataAgendamento;
      if (filtroPeriodo === "DIARIO") return d === today;
      if (filtroPeriodo === "MES") return d.startsWith(filtroMes);
      if (filtroPeriodo === "DIA") return d === filtroDataEsp;
      return true;
    });
  }, [registros, filtroPeriodo, filtroMes, filtroDataEsp]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return filtradosPeriodo.filter(r => {
      if (filtroAgender !== "TODOS" && r.agender !== filtroAgender) return false;
      if (filtroCloser !== "TODOS" && r.closer !== filtroCloser) return false;
      if (filtroStatus !== "TODOS" && r.status !== filtroStatus) return false;
      if (filtroProduto !== "TODOS" && r.produto !== filtroProduto) return false;
      if (q && ![r.nomeLoja, r.proprietario, r.agender, r.closer, r.telefone, r.produto]
        .some(v => v.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [filtradosPeriodo, filtroAgender, filtroCloser, filtroStatus, filtroProduto, busca]);

  const statusCount = useMemo(() => {
    const c: Record<string, number> = {};
    STATUS_ORDER.forEach(s => { c[s] = 0; });
    filtrados.forEach(r => { c[r.status] = (c[r.status] ?? 0) + 1; });
    return c as Record<AgendamentoStatus, number>;
  }, [filtrados]);

  const agenderRanking = useMemo(() => {
    const map: Record<string, { total: number; reunioes: number; cancelados: number }> = {};
    filtrados.forEach(r => {
      if (!r.agender) return;
      if (!map[r.agender]) map[r.agender] = { total: 0, reunioes: 0, cancelados: 0 };
      map[r.agender].total += 1;
      if (r.status === "reuniao_feita" || r.status === "venda_feita") map[r.agender].reunioes += 1;
      if (r.status === "cancelado") map[r.agender].cancelados += 1;
    });
    return Object.entries(map)
      .map(([agender, v]) => ({ agender, ...v }))
      .sort((a, b) => b.reunioes - a.reunioes);
  }, [filtrados]);

  // Vendas: aba real da planilha, filtrada por período via data_venda
  const vendasFiltradas = useMemo(() => {
    const today = todayStr();
    return vendasTab.filter(v => {
      const d = v.dataVenda;
      if (filtroPeriodo === "DIARIO") return d === today;
      if (filtroPeriodo === "MES") return d.startsWith(filtroMes);
      if (filtroPeriodo === "DIA") return d === filtroDataEsp;
      return true;
    });
  }, [vendasTab, filtroPeriodo, filtroMes, filtroDataEsp]);

  // Opções de filtro da tabela vendas (derivadas das vendas já filtradas por período)
  const closersVendas = useMemo(() => {
    const s = new Set<string>();
    vendasFiltradas.forEach(v => { if (v.closer?.trim()) s.add(v.closer.trim()); });
    return Array.from(s).sort();
  }, [vendasFiltradas]);

  const agendersVendas = useMemo(() => {
    const s = new Set<string>();
    vendasFiltradas.forEach(v => { if (v.agender?.trim()) s.add(v.agender.trim()); });
    return Array.from(s).sort();
  }, [vendasFiltradas]);

  const produtosVendas = useMemo(() => {
    const s = new Set<string>();
    vendasFiltradas.forEach(v => { if (v.produto?.trim()) s.add(v.produto.trim()); });
    return Array.from(s).sort();
  }, [vendasFiltradas]);

  const resultadosVendas = useMemo(() => {
    const s = new Set<string>();
    vendasFiltradas.forEach(v => { if (v.resultado?.trim()) s.add(v.resultado.trim()); });
    return Array.from(s).sort();
  }, [vendasFiltradas]);

  const vendasTabFiltradas = useMemo(() => {
    const q = buscaVendas.trim().toLowerCase();
    return vendasFiltradas.filter(v => {
      if (filtroClosersVendas.length > 0 && !filtroClosersVendas.includes(v.closer)) return false;
      if (filtroAgendersVendas.length > 0 && !filtroAgendersVendas.includes(v.agender)) return false;
      if (filtroProdutosVendas.length > 0 && !filtroProdutosVendas.includes(v.produto)) return false;
      if (filtroResultadosVendas.length > 0 && !filtroResultadosVendas.includes(v.resultado)) return false;
      if (filtroStatusVendas === "ATIVAS" && v.cancelada) return false;
      if (filtroStatusVendas === "CANCELADAS" && !v.cancelada) return false;
      if (q && ![v.empresa, v.cliente, v.closer, v.agender, v.produto, v.mesReferencia]
        .some(f => f?.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [vendasFiltradas, buscaVendas, filtroClosersVendas, filtroAgendersVendas, filtroProdutosVendas, filtroResultadosVendas, filtroStatusVendas]);

  // Resumo Diário: aba real da planilha, filtrada por período via data
  const resumoFiltrado = useMemo(() => {
    const today = todayStr();
    return resumoDiarioTab
      .filter(r => {
        const d = r.data;
        if (filtroPeriodo === "DIARIO") return d === today;
        if (filtroPeriodo === "MES") return d.startsWith(filtroMes);
        if (filtroPeriodo === "DIA") return d === filtroDataEsp;
        return true;
      })
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [resumoDiarioTab, filtroPeriodo, filtroMes, filtroDataEsp]);

  const pieData = useMemo(() =>
    STATUS_ORDER
      .filter(s => statusCount[s] > 0)
      .map(s => ({ name: STATUS_LABELS[s], value: statusCount[s], color: STATUS_COLORS[s] })),
    [statusCount]
  );

  const reunioesFeitasTotal = statusCount["reuniao_feita"] + (statusCount["venda_feita"] ?? 0);

  // KPIs Vendas (aba real)
  const vendasReceita = useMemo(() => vendasFiltradas.reduce((s, v) => s + v.valorTotal, 0), [vendasFiltradas]);
  const vendasAtivas = useMemo(() => vendasFiltradas.filter(v => !v.cancelada), [vendasFiltradas]);
  const vendasTicketMedio = vendasAtivas.length > 0 ? vendasReceita / vendasAtivas.length : 0;

  // KPIs Resumo (aba real)
  const resumoTotais = useMemo(() => resumoFiltrado.reduce(
    (acc, r) => ({
      agendamentos: acc.agendamentos + r.agendamentos,
      feitas: acc.feitas + r.feitas,
      vendas: acc.vendas + r.vendas,
      receita: acc.receita + r.receita,
      canceladas: acc.canceladas + r.canceladas,
    }),
    { agendamentos: 0, feitas: 0, vendas: 0, receita: 0, canceladas: 0 }
  ), [resumoFiltrado]);

  // KPIs Performance (aba real)
  const perfTotais = useMemo(() => performanceTab.reduce(
    (acc, p) => ({
      reunioes: acc.reunioes + p.reunioes,
      vendas: acc.vendas + p.vendas,
      receita: acc.receita + p.receita,
    }),
    { reunioes: 0, vendas: 0, receita: 0 }
  ), [performanceTab]);

  const formatDate = (d: string) => {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    if (!y || !m || !day) return d;
    return `${day}/${m}/${y}`;
  };

  if (isLoading && registros.length === 0) {
    return <div className="text-muted-foreground text-sm">Carregando dados...</div>;
  }

  const periodoLabel: Record<FiltroPeriodo, string> = {
    TODOS: "Todos",
    DIARIO: "Diário",
    MES: "Por Mês",
    DIA: "Por Dia",
  };

  const ABAS: { key: AbaAtiva; label: string; count?: number }[] = [
    { key: "agendamentos", label: "Agendamentos", count: filtradosPeriodo.length },
    { key: "vendas", label: "Vendas", count: vendasFiltradas.length },
    { key: "resumo", label: "Resumo Diário", count: resumoFiltrado.length },
    { key: "performance", label: "Performance Closer", count: performanceTab.length },
  ];

  return (
    <div className="space-y-5">

      {/* PERIOD FILTER */}
      <section className="glass-card p-3 flex flex-wrap items-center gap-3">
        <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="flex gap-1.5 flex-wrap">
          {(["TODOS", "DIARIO", "MES", "DIA"] as FiltroPeriodo[]).map(p => (
            <button
              key={p}
              onClick={() => setFiltroPeriodo(p)}
              className={cn(
                "px-3 py-1.5 text-[11px] font-bold tracking-wider uppercase rounded-lg transition-all",
                filtroPeriodo === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {periodoLabel[p]}
            </button>
          ))}
        </div>

        {filtroPeriodo === "MES" && (
          <input
            type="month"
            value={filtroMes}
            onChange={e => setFiltroMes(e.target.value)}
            className="text-xs bg-secondary text-foreground rounded-lg px-2 py-1.5 border border-border focus:outline-none focus:ring-1 focus:ring-ring"
          />
        )}
        {filtroPeriodo === "DIA" && (
          <input
            type="date"
            value={filtroDataEsp}
            onChange={e => setFiltroDataEsp(e.target.value)}
            className="text-xs bg-secondary text-foreground rounded-lg px-2 py-1.5 border border-border focus:outline-none focus:ring-1 focus:ring-ring"
          />
        )}
        {filtroPeriodo === "DIARIO" && (
          <span className="text-xs text-muted-foreground">{formatDate(todayStr())}</span>
        )}
      </section>

      {/* SUB-TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {ABAS.map(aba => (
          <button
            key={aba.key}
            onClick={() => setAbaAtiva(aba.key)}
            className={cn(
              "px-3 py-1.5 text-[10px] sm:text-[11px] font-bold tracking-wider uppercase rounded-lg transition-all whitespace-nowrap",
              abaAtiva === aba.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {aba.label}
            {aba.count !== undefined && (
              <span className={cn("ml-1.5 text-[9px] px-1 py-0.5 rounded",
                abaAtiva === aba.key ? "bg-primary-foreground/20" : "bg-muted"
              )}>
                {aba.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ==================== ABA: AGENDAMENTOS ==================== */}
      {abaAtiva === "agendamentos" && (
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard title="Total Agendamentos" value={filtrados.length} subtitle="Com filtros aplicados" icon={CalendarCheck} variant="info" delay={0} />
            <KpiCard title="Reuniões Feitas" value={reunioesFeitasTotal} subtitle={`${filtrados.length > 0 ? ((reunioesFeitasTotal / filtrados.length) * 100).toFixed(0) : 0}% de conversão`} icon={Users} variant="success" delay={1} />
            <KpiCard title="Em Atend. Closer" value={statusCount["em_atendimento_closer"]} subtitle="Aguardando fechamento" icon={TrendingUp} variant="default" delay={2} />
            <KpiCard title="Cancelados" value={statusCount["cancelado"]} subtitle={`${filtrados.length > 0 ? ((statusCount["cancelado"] / filtrados.length) * 100).toFixed(0) : 0}% do total`} icon={XCircle} variant="warning" delay={3} />
          </div>

          {/* Gráficos */}
          {registros.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <section className="glass-card p-4">
                <h3 className="font-heading font-bold text-foreground text-base mb-3">Distribuição por Status</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="glass-card p-4">
                <h3 className="font-heading font-bold text-foreground text-base mb-3">Reuniões por Agender</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agenderRanking.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <YAxis dataKey="agender" type="category" stroke="hsl(var(--muted-foreground))" fontSize={9} width={130} />
                      <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="reunioes" name="Reuniões" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="cancelados" name="Cancelados" fill="hsl(0 65% 55%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>
          )}

          {/* Tabela de Agendamentos */}
          <section className="glass-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <button
                onClick={() => setTabelaOpen(o => !o)}
                className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
                aria-expanded={tabelaOpen}
              >
                <ChevronDown className={cn("w-4 h-4 transition-transform", tabelaOpen ? "rotate-0" : "-rotate-90")} />
                <h3 className="font-heading font-bold text-lg">Agendamentos</h3>
                <span className="text-xs text-muted-foreground font-normal">({filtrados.length})</span>
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-muted-foreground" />

                {/* Agender picker */}
                <Popover open={agenderPickerOpen} onOpenChange={setAgenderPickerOpen}>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 text-xs bg-secondary text-foreground rounded-lg px-2.5 py-1.5 border border-border hover:bg-secondary/70 min-w-[130px] justify-between">
                      <span className="truncate">{filtroAgender === "TODOS" ? "Todos agenders" : filtroAgender.split(" ")[0]}</span>
                      <ChevronsUpDown className="w-3 h-3 opacity-50 shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-60" align="start">
                    <Command>
                      <CommandInput placeholder="Pesquisar agender..." className="h-9" />
                      <CommandList>
                        <CommandEmpty>Nenhum encontrado</CommandEmpty>
                        <CommandGroup>
                          <CommandItem value="todos" onSelect={() => { setFiltroAgender("TODOS"); setAgenderPickerOpen(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", filtroAgender === "TODOS" ? "opacity-100" : "opacity-0")} />
                            Todos agenders
                          </CommandItem>
                          {agenders.map(a => (
                            <CommandItem key={a} value={a} onSelect={() => { setFiltroAgender(a); setAgenderPickerOpen(false); }}>
                              <Check className={cn("mr-2 h-4 w-4", filtroAgender === a ? "opacity-100" : "opacity-0")} />
                              {a}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Closer picker */}
                <Popover open={closerPickerOpen} onOpenChange={setCloserPickerOpen}>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 text-xs bg-secondary text-foreground rounded-lg px-2.5 py-1.5 border border-border hover:bg-secondary/70 min-w-[120px] justify-between">
                      <span className="truncate">{filtroCloser === "TODOS" ? "Todos closers" : filtroCloser.split(" ")[0]}</span>
                      <ChevronsUpDown className="w-3 h-3 opacity-50 shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-60" align="start">
                    <Command>
                      <CommandInput placeholder="Pesquisar closer..." className="h-9" />
                      <CommandList>
                        <CommandEmpty>Nenhum encontrado</CommandEmpty>
                        <CommandGroup>
                          <CommandItem value="todos" onSelect={() => { setFiltroCloser("TODOS"); setCloserPickerOpen(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", filtroCloser === "TODOS" ? "opacity-100" : "opacity-0")} />
                            Todos closers
                          </CommandItem>
                          {closers.map(c => (
                            <CommandItem key={c} value={c} onSelect={() => { setFiltroCloser(c); setCloserPickerOpen(false); }}>
                              <Check className={cn("mr-2 h-4 w-4", filtroCloser === c ? "opacity-100" : "opacity-0")} />
                              {c}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as AgendamentoStatus | "TODOS")} className="text-xs bg-secondary text-foreground rounded-lg px-2 py-1.5 border border-border">
                  <option value="TODOS">Todos status</option>
                  {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>

                <select value={filtroProduto} onChange={e => setFiltroProduto(e.target.value)} className="text-xs bg-secondary text-foreground rounded-lg px-2 py-1.5 border border-border">
                  <option value="TODOS">Todos produtos</option>
                  {produtos.map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                <input
                  type="text"
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Buscar loja, proprietário..."
                  className="h-7 w-48 rounded-md border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            {/* Status counters */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
              {STATUS_ORDER.map(s => (
                <button
                  key={s}
                  onClick={() => setFiltroStatus(filtroStatus === s ? "TODOS" : s)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border transition",
                    filtroStatus === s
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary/40 hover:bg-secondary/70"
                  )}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STATUS_COLORS[s] }} />
                  <div className="min-w-0 text-left">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider truncate">{STATUS_LABELS[s]}</p>
                    <p className="text-sm font-bold tabular-nums text-foreground">{statusCount[s]}</p>
                  </div>
                </button>
              ))}
            </div>

            {tabelaOpen && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="py-2 pr-3 font-semibold">Agendado</th>
                      <th className="py-2 pr-3 font-semibold">Reunião</th>
                      <th className="py-2 pr-3 font-semibold">Hora</th>
                      <th className="py-2 pr-3 font-semibold">Agender</th>
                      <th className="py-2 pr-3 font-semibold">Closer</th>
                      <th className="py-2 pr-3 font-semibold">Loja</th>
                      <th className="py-2 pr-3 font-semibold">Proprietário</th>
                      <th className="py-2 pr-3 font-semibold">Produto</th>
                      <th className="py-2 pr-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.slice(0, 300).map((r, i) => (
                      <tr key={r.id || i} className="border-b border-border/50 hover:bg-secondary/30">
                        <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{formatDate(r.dataAgendamento)}</td>
                        <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{formatDate(r.dataReuniao)}</td>
                        <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{r.horario}</td>
                        <td className="py-2 pr-3 text-foreground">{r.agender}</td>
                        <td className="py-2 pr-3 text-foreground">{r.closer || "—"}</td>
                        <td className="py-2 pr-3 text-foreground font-medium">{r.nomeLoja}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{r.proprietario}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{r.produto}</td>
                        <td className="py-2 pr-3">
                          <span
                            className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap"
                            style={{
                              background: `${STATUS_COLORS[r.status]}25`,
                              color: STATUS_COLORS[r.status],
                              border: `1px solid ${STATUS_COLORS[r.status]}55`,
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLORS[r.status] }} />
                            {STATUS_LABELS[r.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filtrados.length === 0 && (
                      <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">Sem registros</td></tr>
                    )}
                  </tbody>
                </table>
                {filtrados.length > 300 && (
                  <p className="text-[10px] text-muted-foreground text-center mt-2">Mostrando 300 de {filtrados.length} — use os filtros para refinar</p>
                )}
              </div>
            )}
          </section>

          {/* Ranking de Agenders */}
          {agenderRanking.length > 0 && (
            <section className="glass-card p-4">
              <h3 className="font-heading font-bold text-foreground text-base mb-3">Ranking de Agenders</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="py-2 pr-3 font-semibold">Agender</th>
                      <th className="py-2 pr-3 font-semibold text-right">Total</th>
                      <th className="py-2 pr-3 font-semibold text-right">Reuniões</th>
                      <th className="py-2 pr-3 font-semibold text-right">Cancelados</th>
                      <th className="py-2 pr-3 font-semibold text-right">Taxa conversão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agenderRanking.map((r, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2 pr-3 text-foreground font-semibold">{r.agender}</td>
                        <td className="py-2 pr-3 text-right text-muted-foreground tabular-nums">{r.total}</td>
                        <td className="py-2 pr-3 text-right text-foreground tabular-nums">{r.reunioes}</td>
                        <td className="py-2 pr-3 text-right text-muted-foreground tabular-nums">{r.cancelados}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          <span className={r.total > 0 && r.reunioes / r.total >= 0.5 ? "text-success" : "text-muted-foreground"}>
                            {r.total > 0 ? `${((r.reunioes / r.total) * 100).toFixed(0)}%` : "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {/* ==================== ABA: VENDAS ==================== */}
      {abaAtiva === "vendas" && (
        <div className="space-y-5">
          {/* KPIs Vendas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard title="Vendas Ativas" value={vendasAtivas.length} subtitle="No período" icon={ShoppingBag} variant="success" delay={0} />
            <KpiCard title="Receita" value={formatCurrencyBR(vendasReceita)} subtitle="No período" icon={DollarSign} variant="success" delay={1} />
            <KpiCard title="Ticket Médio" value={formatCurrencyBR(vendasTicketMedio)} subtitle="Por venda ativa" icon={TrendingUp} variant="info" delay={2} />
            <KpiCard
              title="Canceladas"
              value={vendasFiltradas.length - vendasAtivas.length}
              subtitle={`de ${vendasFiltradas.length} total`}
              icon={XCircle}
              variant="warning"
              delay={3}
            />
          </div>

          {/* Gráfico Receita por Closer */}
          {vendasAtivas.length > 0 && (() => {
            const porCloser = Object.entries(
              vendasAtivas.reduce<Record<string, { qtd: number; receita: number }>>((acc, v) => {
                const c = v.closer || "Sem closer";
                if (!acc[c]) acc[c] = { qtd: 0, receita: 0 };
                acc[c].qtd += 1;
                acc[c].receita += v.valorTotal;
                return acc;
              }, {})
            )
              .map(([closer, d]) => ({ closer, ...d }))
              .sort((a, b) => b.receita - a.receita);

            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <section className="glass-card p-4">
                  <h3 className="font-heading font-bold text-foreground text-base mb-3">Vendas por Closer</h3>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={porCloser} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} allowDecimals={false} />
                        <YAxis dataKey="closer" type="category" stroke="hsl(var(--muted-foreground))" fontSize={9} width={120} />
                        <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="qtd" name="Qtd Vendas" fill="hsl(160 70% 40%)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
                <section className="glass-card p-4">
                  <h3 className="font-heading font-bold text-foreground text-base mb-3">Receita por Closer</h3>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={porCloser} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                        <YAxis dataKey="closer" type="category" stroke="hsl(var(--muted-foreground))" fontSize={9} width={120} />
                        <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatCurrencyBR(v)} />
                        <Bar dataKey="receita" name="Receita" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              </div>
            );
          })()}

          {/* Tabela Vendas */}
          <section className="glass-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="font-heading font-bold text-foreground text-base">
                Vendas Realizadas
                <span className="ml-2 text-xs text-muted-foreground font-normal">({vendasTabFiltradas.length}{vendasTabFiltradas.length !== vendasFiltradas.length ? ` de ${vendasFiltradas.length}` : ""})</span>
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground shrink-0" />

                {/* Closer multi-select */}
                {closersVendas.length > 0 && (
                  <Popover open={closerVendasOpen} onOpenChange={setCloserVendasOpen}>
                    <PopoverTrigger asChild>
                      <button className={cn("flex items-center gap-1 text-xs rounded-lg px-2 py-1.5 border border-border bg-secondary text-foreground", filtroClosersVendas.length > 0 && "border-primary/60 bg-primary/10 text-primary")}>
                        {filtroClosersVendas.length === 0 ? "Closers" : `Closers (${filtroClosersVendas.length})`}
                        <ChevronsUpDown className="h-3 w-3 opacity-50 shrink-0" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[180px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar closer..." />
                        <CommandList>
                          <CommandEmpty>Nenhum encontrado</CommandEmpty>
                          <CommandGroup>
                            {closersVendas.map(c => (
                              <CommandItem key={c} onSelect={() => setFiltroClosersVendas(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}>
                                <Check className={cn("mr-2 h-3.5 w-3.5", filtroClosersVendas.includes(c) ? "opacity-100" : "opacity-0")} />
                                <span className="text-xs">{c}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}

                {/* Agender multi-select */}
                {agendersVendas.length > 0 && (
                  <Popover open={agenderVendasOpen} onOpenChange={setAgenderVendasOpen}>
                    <PopoverTrigger asChild>
                      <button className={cn("flex items-center gap-1 text-xs rounded-lg px-2 py-1.5 border border-border bg-secondary text-foreground", filtroAgendersVendas.length > 0 && "border-primary/60 bg-primary/10 text-primary")}>
                        {filtroAgendersVendas.length === 0 ? "Agenders" : `Agenders (${filtroAgendersVendas.length})`}
                        <ChevronsUpDown className="h-3 w-3 opacity-50 shrink-0" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[180px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar agender..." />
                        <CommandList>
                          <CommandEmpty>Nenhum encontrado</CommandEmpty>
                          <CommandGroup>
                            {agendersVendas.map(a => (
                              <CommandItem key={a} onSelect={() => setFiltroAgendersVendas(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])}>
                                <Check className={cn("mr-2 h-3.5 w-3.5", filtroAgendersVendas.includes(a) ? "opacity-100" : "opacity-0")} />
                                <span className="text-xs">{a}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}

                {/* Produto multi-select */}
                {produtosVendas.length > 0 && (
                  <Popover open={produtoVendasOpen} onOpenChange={setProdutoVendasOpen}>
                    <PopoverTrigger asChild>
                      <button className={cn("flex items-center gap-1 text-xs rounded-lg px-2 py-1.5 border border-border bg-secondary text-foreground", filtroProdutosVendas.length > 0 && "border-primary/60 bg-primary/10 text-primary")}>
                        {filtroProdutosVendas.length === 0 ? "Produtos" : `Produtos (${filtroProdutosVendas.length})`}
                        <ChevronsUpDown className="h-3 w-3 opacity-50 shrink-0" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar produto..." />
                        <CommandList>
                          <CommandEmpty>Nenhum encontrado</CommandEmpty>
                          <CommandGroup>
                            {produtosVendas.map(p => (
                              <CommandItem key={p} onSelect={() => setFiltroProdutosVendas(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}>
                                <Check className={cn("mr-2 h-3.5 w-3.5", filtroProdutosVendas.includes(p) ? "opacity-100" : "opacity-0")} />
                                <span className="text-xs">{p}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}

                {/* Resultado multi-select */}
                {resultadosVendas.length > 0 && (
                  <Popover open={resultadoVendasOpen} onOpenChange={setResultadoVendasOpen}>
                    <PopoverTrigger asChild>
                      <button className={cn("flex items-center gap-1 text-xs rounded-lg px-2 py-1.5 border border-border bg-secondary text-foreground", filtroResultadosVendas.length > 0 && "border-primary/60 bg-primary/10 text-primary")}>
                        {filtroResultadosVendas.length === 0 ? "Resultado" : `Resultado (${filtroResultadosVendas.length})`}
                        <ChevronsUpDown className="h-3 w-3 opacity-50 shrink-0" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[180px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar resultado..." />
                        <CommandList>
                          <CommandEmpty>Nenhum encontrado</CommandEmpty>
                          <CommandGroup>
                            {resultadosVendas.map(r => (
                              <CommandItem key={r} onSelect={() => setFiltroResultadosVendas(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])}>
                                <Check className={cn("mr-2 h-3.5 w-3.5", filtroResultadosVendas.includes(r) ? "opacity-100" : "opacity-0")} />
                                <span className="text-xs">{r}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}

                {/* Status select */}
                <select
                  value={filtroStatusVendas}
                  onChange={e => setFiltroStatusVendas(e.target.value as "TODOS" | "ATIVAS" | "CANCELADAS")}
                  className="text-xs bg-secondary text-foreground rounded-lg px-2 py-1.5 border border-border"
                >
                  <option value="TODOS">Todas</option>
                  <option value="ATIVAS">Apenas ativas</option>
                  <option value="CANCELADAS">Apenas canceladas</option>
                </select>

                <input
                  type="text"
                  value={buscaVendas}
                  onChange={e => setBuscaVendas(e.target.value)}
                  placeholder="Buscar empresa, cliente..."
                  className="h-8 w-52 rounded-lg border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />

                {/* Limpar filtros */}
                {(filtroClosersVendas.length > 0 || filtroAgendersVendas.length > 0 || filtroProdutosVendas.length > 0 || filtroResultadosVendas.length > 0 || filtroStatusVendas !== "TODOS" || buscaVendas) && (
                  <button
                    onClick={() => { setFiltroClosersVendas([]); setFiltroAgendersVendas([]); setFiltroProdutosVendas([]); setFiltroResultadosVendas([]); setFiltroStatusVendas("TODOS"); setBuscaVendas(""); }}
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
            {vendasFiltradas.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Nenhuma venda no período selecionado</p>
            ) : vendasTabFiltradas.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Nenhuma venda com os filtros aplicados</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="py-2 pr-3 font-semibold">#</th>
                      <th className="py-2 pr-3 font-semibold">Data Venda</th>
                      <th className="py-2 pr-3 font-semibold">Closer</th>
                      <th className="py-2 pr-3 font-semibold">Empresa</th>
                      <th className="py-2 pr-3 font-semibold">Cliente</th>
                      <th className="py-2 pr-3 font-semibold">Produto</th>
                      <th className="py-2 pr-3 font-semibold">Mês Ref.</th>
                      <th className="py-2 pr-3 font-semibold">Forma Pgto</th>
                      <th className="py-2 pr-3 font-semibold text-right">Valor</th>
                      <th className="py-2 pr-3 font-semibold">Resultado</th>
                      <th className="py-2 pr-3 font-semibold">Cancelada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendasTabFiltradas.map((v, i) => (
                      <tr key={v.id || i} className={`border-b border-border/50 hover:bg-secondary/30 ${v.cancelada ? "opacity-50" : ""}`}>
                        <td className="py-2 pr-3 text-muted-foreground tabular-nums">{i + 1}</td>
                        <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{formatDate(v.dataVenda)}</td>
                        <td className="py-2 pr-3 text-foreground font-medium">{v.closer || "—"}</td>
                        <td className="py-2 pr-3 text-foreground">{v.empresa || "—"}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{v.cliente || "—"}</td>
                        <td className="py-2 pr-3">
                          {v.produto ? (
                            <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-success/15 text-success border border-success/30">
                              {v.produto}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground">{v.mesReferencia || "—"}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{v.formaPagamento || "—"}</td>
                        <td className="py-2 pr-3 text-right font-semibold tabular-nums text-foreground">{v.valorTotal > 0 ? formatCurrencyBR(v.valorTotal) : "—"}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{v.resultado || "—"}</td>
                        <td className="py-2 pr-3">
                          {v.cancelada ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-destructive/15 text-destructive border border-destructive/30">Sim</span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ==================== ABA: RESUMO DIÁRIO ==================== */}
      {abaAtiva === "resumo" && (
        <div className="space-y-5">
          {/* KPIs resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard title="Agendamentos" value={resumoTotais.agendamentos} subtitle="No período" icon={CalendarCheck} variant="info" delay={0} />
            <KpiCard title="Feitas" value={resumoTotais.feitas} subtitle="Reuniões realizadas" icon={Users} variant="success" delay={1} />
            <KpiCard title="Vendas" value={resumoTotais.vendas} subtitle="Fechamentos" icon={ShoppingBag} variant="success" delay={2} />
            <KpiCard title="Receita" value={formatCurrencyBR(resumoTotais.receita)} subtitle="No período" icon={DollarSign} variant="success" delay={3} />
          </div>

          {/* Tabela Resumo */}
          <section className="glass-card p-4">
            <h3 className="font-heading font-bold text-foreground text-base mb-4">
              Resumo por Dia
              <span className="ml-2 text-xs text-muted-foreground font-normal">({resumoFiltrado.length} dias)</span>
            </h3>
            {resumoFiltrado.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Sem dados no período selecionado</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="py-2 pr-3 font-semibold">Data</th>
                      <th className="py-2 pr-3 font-semibold text-right">Agend.</th>
                      <th className="py-2 pr-3 font-semibold text-right">Auditadas</th>
                      <th className="py-2 pr-3 font-semibold text-right">Feitas</th>
                      <th className="py-2 pr-3 font-semibold text-right">Em Atend.</th>
                      <th className="py-2 pr-3 font-semibold text-right">Ag. Reag.</th>
                      <th className="py-2 pr-3 font-semibold text-right">Reagend.</th>
                      <th className="py-2 pr-3 font-semibold text-right">Cancel.</th>
                      <th className="py-2 pr-3 font-semibold text-right">A Fazer</th>
                      <th className="py-2 pr-3 font-semibold text-right">Vendas</th>
                      <th className="py-2 pr-3 font-semibold text-right">Receita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumoFiltrado.map((dia, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-secondary/30">
                        <td className="py-2 pr-3 text-foreground font-medium whitespace-nowrap">{formatDate(dia.data)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-foreground font-semibold">{dia.agendamentos}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{dia.auditadas}</td>
                        <td className="py-2 pr-3 text-right tabular-nums" style={{ color: STATUS_COLORS["reuniao_feita"] }}>{dia.feitas}</td>
                        <td className="py-2 pr-3 text-right tabular-nums" style={{ color: STATUS_COLORS["em_atendimento_closer"] }}>{dia.emAtendimento}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{dia.aguardandoReagendamento}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{dia.reagendadas}</td>
                        <td className="py-2 pr-3 text-right tabular-nums" style={{ color: STATUS_COLORS["cancelado"] }}>{dia.canceladas}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{dia.aFazer}</td>
                        <td className="py-2 pr-3 text-right tabular-nums font-bold" style={{ color: STATUS_COLORS["venda_feita"] }}>{dia.vendas}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-foreground font-semibold">{dia.receita > 0 ? formatCurrencyBR(dia.receita) : "—"}</td>
                      </tr>
                    ))}
                    {/* Totais */}
                    <tr className="border-t-2 border-border font-bold bg-secondary/30">
                      <td className="py-2 pr-3 text-foreground">TOTAL</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-foreground">{resumoTotais.agendamentos}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{resumoFiltrado.reduce((s, d) => s + d.auditadas, 0)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums" style={{ color: STATUS_COLORS["reuniao_feita"] }}>{resumoTotais.feitas}</td>
                      <td className="py-2 pr-3 text-right tabular-nums" style={{ color: STATUS_COLORS["em_atendimento_closer"] }}>{resumoFiltrado.reduce((s, d) => s + d.emAtendimento, 0)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{resumoFiltrado.reduce((s, d) => s + d.aguardandoReagendamento, 0)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{resumoFiltrado.reduce((s, d) => s + d.reagendadas, 0)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums" style={{ color: STATUS_COLORS["cancelado"] }}>{resumoTotais.canceladas}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{resumoFiltrado.reduce((s, d) => s + d.aFazer, 0)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums font-bold" style={{ color: STATUS_COLORS["venda_feita"] }}>{resumoTotais.vendas}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-foreground">{formatCurrencyBR(resumoTotais.receita)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ==================== ABA: PERFORMANCE CLOSER ==================== */}
      {abaAtiva === "performance" && (
        <div className="space-y-5">
          {/* KPIs performance */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard title="Closers" value={performanceTab.length} subtitle="Na planilha" icon={Award} variant="info" delay={0} />
            <KpiCard title="Reuniões" value={perfTotais.reunioes} subtitle="Total acumulado" icon={Users} variant="default" delay={1} />
            <KpiCard title="Vendas" value={perfTotais.vendas} subtitle="Total acumulado" icon={ShoppingBag} variant="success" delay={2} />
            <KpiCard title="Receita" value={formatCurrencyBR(perfTotais.receita)} subtitle="Total acumulado" icon={DollarSign} variant="success" delay={3} />
          </div>

          {/* Gráficos Performance */}
          {performanceTab.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <section className="glass-card p-4">
                <h3 className="font-heading font-bold text-foreground text-base mb-3">Vendas por Closer</h3>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[...performanceTab].sort((a, b) => b.vendas - a.vendas)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} allowDecimals={false} />
                      <YAxis dataKey="closer" type="category" stroke="hsl(var(--muted-foreground))" fontSize={9} width={130} />
                      <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="vendas" name="Vendas" fill="hsl(160 70% 40%)" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="reunioes" name="Reuniões" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
              <section className="glass-card p-4">
                <h3 className="font-heading font-bold text-foreground text-base mb-3">Receita por Closer</h3>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[...performanceTab].sort((a, b) => b.receita - a.receita)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                      <YAxis dataKey="closer" type="category" stroke="hsl(var(--muted-foreground))" fontSize={9} width={130} />
                      <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatCurrencyBR(v)} />
                      <Bar dataKey="receita" name="Receita" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>
          )}

          {/* Tabela Performance */}
          <section className="glass-card p-4">
            <h3 className="font-heading font-bold text-foreground text-base mb-4">
              Performance do Closer
              <span className="ml-2 text-xs text-muted-foreground font-normal">({performanceTab.length})</span>
            </h3>
            {performanceTab.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Sem dados de performance</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="py-2 pr-3 font-semibold">#</th>
                      <th className="py-2 pr-3 font-semibold">Closer</th>
                      <th className="py-2 pr-3 font-semibold text-right">Reuniões</th>
                      <th className="py-2 pr-3 font-semibold text-right">Vendas</th>
                      <th className="py-2 pr-3 font-semibold text-right">Receita</th>
                      <th className="py-2 pr-3 font-semibold text-right">Ticket Médio</th>
                      <th className="py-2 pr-3 font-semibold text-right">Conv.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...performanceTab]
                      .sort((a, b) => b.vendas - a.vendas)
                      .map((c, i) => {
                        const conv = c.reunioes > 0 ? (c.vendas / c.reunioes) * 100 : 0;
                        return (
                          <tr key={i} className="border-b border-border/50 hover:bg-secondary/30">
                            <td className="py-2 pr-3 text-muted-foreground tabular-nums">{i + 1}</td>
                            <td className="py-2 pr-3 text-foreground font-semibold">{c.closer}</td>
                            <td className="py-2 pr-3 text-right tabular-nums" style={{ color: STATUS_COLORS["reuniao_feita"] }}>{c.reunioes}</td>
                            <td className="py-2 pr-3 text-right tabular-nums font-bold" style={{ color: STATUS_COLORS["venda_feita"] }}>{c.vendas}</td>
                            <td className="py-2 pr-3 text-right tabular-nums text-foreground font-semibold">{c.receita > 0 ? formatCurrencyBR(c.receita) : "—"}</td>
                            <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{c.ticketMedio > 0 ? formatCurrencyBR(c.ticketMedio) : "—"}</td>
                            <td className="py-2 pr-3 text-right tabular-nums">
                              <span className={conv >= 30 ? "text-success font-semibold" : "text-muted-foreground"}>
                                {c.reunioes > 0 ? `${conv.toFixed(0)}%` : "—"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    {/* Totais */}
                    <tr className="border-t-2 border-border font-bold bg-secondary/30">
                      <td colSpan={2} className="py-2 pr-3 text-foreground">TOTAL</td>
                      <td className="py-2 pr-3 text-right tabular-nums" style={{ color: STATUS_COLORS["reuniao_feita"] }}>{perfTotais.reunioes}</td>
                      <td className="py-2 pr-3 text-right tabular-nums" style={{ color: STATUS_COLORS["venda_feita"] }}>{perfTotais.vendas}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-foreground">{formatCurrencyBR(perfTotais.receita)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">
                        {perfTotais.vendas > 0 ? formatCurrencyBR(perfTotais.receita / perfTotais.vendas) : "—"}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        <span className={perfTotais.reunioes > 0 && (perfTotais.vendas / perfTotais.reunioes) >= 0.3 ? "text-success font-semibold" : "text-muted-foreground"}>
                          {perfTotais.reunioes > 0 ? `${((perfTotais.vendas / perfTotais.reunioes) * 100).toFixed(0)}%` : "—"}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default ComercialSalvadorContent;
