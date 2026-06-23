import { useMemo, useState } from "react";
import { useComercialSalvadorGeral } from "@/hooks/useComercialSalvadorGeral";
import { useComercialSalvadorDiario } from "@/hooks/useComercialSalvadorDiario";
import { STATUS_LABELS, STATUS_COLORS, DiarioStatus } from "@/services/comercialSalvadorDiarioService";
import { formatCurrencyBR } from "@/data/financeiro";
import KpiCard from "./KpiCard";
import {
  CalendarCheck, Users, DollarSign, ShoppingCart,
  TrendingUp, Phone, ExternalLink, Filter, Check, ChevronsUpDown, ChevronDown, Download,
} from "lucide-react";
import ComercialSalvadorDiarioExportModal from "./ComercialSalvadorDiarioExportModal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";

const STATUS_ORDER: DiarioStatus[] = ["FEITO", "SEM_RESPOSTA", "REAGENDAMENTO", "A_FAZER"];

const ComercialSalvadorContent = () => {
  const { data: geral, isLoading: loadingG } = useComercialSalvadorGeral();
  const { data: diario, isLoading: loadingD } = useComercialSalvadorDiario();

  const [filtroAbas, setFiltroAbas] = useState<string[]>([]);
  const [filtroMes, setFiltroMes] = useState<string>("TODOS");
  const [filtroAgender, setFiltroAgender] = useState<string>("TODOS");
  const [filtroStatus, setFiltroStatus] = useState<DiarioStatus | "TODOS">("TODOS");
  const [abaPickerOpen, setAbaPickerOpen] = useState(false);
  const [diarioOpen, setDiarioOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [buscaBase, setBuscaBase] = useState("");
  const [filtroMesesBase, setFiltroMesesBase] = useState<string[]>([]);
  const [mesPickerBaseOpen, setMesPickerBaseOpen] = useState(false);

  const registros = diario?.registros ?? [];

  const agenders = useMemo(() => {
    const s = new Set<string>();
    registros.forEach(r => { if (r.agender?.trim()) s.add(r.agender.trim()); });
    return Array.from(s).sort();
  }, [registros]);

  const dateToYM = (s: string): string | null => {
    if (!s) return null;
    const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!m) return null;
    return `${m[3]}-${m[2]}`;
  };
  const recordYM = (r: typeof registros[number]): string | null =>
    dateToYM(r.dataReuniao) ?? dateToYM(r.dataAgendamento) ?? dateToYM(r.aba);
  const MESES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const formatYM = (ym: string) => {
    const [y, mo] = ym.split("-");
    return `${MESES_PT[parseInt(mo, 10) - 1]}/${y}`;
  };
  const mesesDisponiveis = useMemo(() => {
    const s = new Set<string>();
    registros.forEach(r => { const ym = recordYM(r); if (ym) s.add(ym); });
    return Array.from(s).sort().reverse();
  }, [registros]);

  const filtrados = useMemo(() => {
    return registros.filter(r => {
      if (filtroAbas.length > 0 && !filtroAbas.includes(r.aba)) return false;
      if (filtroMes !== "TODOS" && recordYM(r) !== filtroMes) return false;
      if (filtroAgender !== "TODOS" && r.agender !== filtroAgender) return false;
      if (filtroStatus !== "TODOS" && r.status !== filtroStatus) return false;
      return true;
    });
  }, [registros, filtroAbas, filtroMes, filtroAgender, filtroStatus]);

  const statusCount = useMemo(() => {
    const c: Record<DiarioStatus, number> = { FEITO: 0, SEM_RESPOSTA: 0, REAGENDAMENTO: 0, A_FAZER: 0 };
    filtrados.forEach(r => { c[r.status] += 1; });
    return c;
  }, [filtrados]);

  const totalReunioesMaio = useMemo(() => {
    return (geral?.reunioesMaio ?? []).reduce((s, l) => s + l.reunioesFeitas, 0);
  }, [geral]);
  const totalVendasMaio = useMemo(() => {
    return geral?.totalVendasMesVigente ?? 0;
  }, [geral]);
  const totalAgendamentosMaio = useMemo(() => {
    return (geral?.reunioesMaio ?? []).reduce((s, l) => s + l.agendamentos, 0);
  }, [geral]);

  if (!geral && !diario) {
    return <div className="text-muted-foreground text-sm">Carregando dados...</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard title="Agendamentos" value={totalAgendamentosMaio} subtitle="Mês vigente" icon={CalendarCheck} variant="info" delay={0} />
        <KpiCard title="Reuniões Feitas" value={totalReunioesMaio} subtitle="Mês vigente" icon={Users} variant="success" delay={1} />
        <KpiCard title="Vendas" value={totalVendasMaio} subtitle="Mês vigente" icon={ShoppingCart} variant="default" delay={2} />
        <KpiCard title="Receita" value={formatCurrencyBR(geral?.receitaMesVigente ?? 0)} subtitle="Mês vigente" icon={DollarSign} variant="success" delay={3} />
        <KpiCard title="Tarefas (Diário)" value={filtrados.length} subtitle={`${statusCount.FEITO} feitas`} icon={TrendingUp} variant="info" delay={4} />
      </div>

      {/* Status do Diário */}
      <section className="glass-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <button
            onClick={() => setDiarioOpen(o => !o)}
            className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
            aria-expanded={diarioOpen}
          >
            <ChevronDown className={cn("w-4 h-4 transition-transform", diarioOpen ? "rotate-0" : "-rotate-90")} />
            <h3 className="font-heading font-bold text-lg">Controle Diário</h3>
            <span className="text-xs text-muted-foreground font-normal">({filtrados.length})</span>
          </button>
          {diarioOpen && (
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Popover open={abaPickerOpen} onOpenChange={setAbaPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-2 text-xs bg-secondary text-foreground rounded-lg px-2.5 py-1.5 border border-border hover:bg-secondary/70 min-w-[140px] justify-between"
                  )}
                >
                  <span className="truncate">
                    {filtroAbas.length === 0
                      ? "Todas as datas"
                      : filtroAbas.length === 1
                        ? filtroAbas[0]
                        : `${filtroAbas.length} datas`}
                  </span>
                  <ChevronsUpDown className="w-3 h-3 opacity-50 shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-56" align="start">
                <Command>
                  <CommandInput placeholder="Pesquisar data..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>Nenhuma data encontrada</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="todas as datas"
                        onSelect={() => setFiltroAbas([])}
                      >
                        <Check className={cn("mr-2 h-4 w-4", filtroAbas.length === 0 ? "opacity-100" : "opacity-0")} />
                        Todas as datas
                      </CommandItem>
                      {(diario?.abas ?? []).map(a => {
                        const checked = filtroAbas.includes(a);
                        return (
                          <CommandItem
                            key={a}
                            value={a}
                            onSelect={() => {
                              setFiltroAbas(prev =>
                                prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
                              );
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", checked ? "opacity-100" : "opacity-0")} />
                            {a}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className="text-xs bg-secondary text-foreground rounded-lg px-2 py-1.5 border border-border">
              <option value="TODOS">Todos os meses</option>
              {mesesDisponiveis.map(ym => <option key={ym} value={ym}>{formatYM(ym)}</option>)}
            </select>
            <select value={filtroAgender} onChange={e => setFiltroAgender(e.target.value)} className="text-xs bg-secondary text-foreground rounded-lg px-2 py-1.5 border border-border">
              <option value="TODOS">Todos agenders</option>
              {agenders.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as DiarioStatus | "TODOS")} className="text-xs bg-secondary text-foreground rounded-lg px-2 py-1.5 border border-border">
              <option value="TODOS">Todos status</option>
              {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <button
              onClick={() => setExportOpen(true)}
              className="flex items-center gap-1.5 text-xs bg-primary/15 text-primary border border-primary/40 hover:bg-primary/25 rounded-lg px-2.5 py-1.5 font-semibold transition"
            >
              <Download className="w-3.5 h-3.5" /> Exportar
            </button>
          </div>
          )}
        </div>

        <ComercialSalvadorDiarioExportModal
          open={exportOpen}
          onOpenChange={setExportOpen}
          rows={filtrados}
          filtroAba={filtroAbas.length === 0 ? "TODAS" : filtroAbas.join(", ")}
          filtroAgender={filtroAgender}
          filtroStatus={filtroStatus === "TODOS" ? "TODOS" : STATUS_LABELS[filtroStatus as DiarioStatus]}
        />

        {diarioOpen && (<>

        {/* Status counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {STATUS_ORDER.map(s => (
            <div key={s} className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-secondary/40">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: STATUS_COLORS[s] }} />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{STATUS_LABELS[s]}</p>
                <p className="text-sm font-bold tabular-nums text-foreground">{statusCount[s]}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabela de registros */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2 pr-3 font-semibold">Data</th>
                <th className="py-2 pr-3 font-semibold">Agender</th>
                <th className="py-2 pr-3 font-semibold">Loja</th>
                <th className="py-2 pr-3 font-semibold">Reunião</th>
                <th className="py-2 pr-3 font-semibold">Hora</th>
                <th className="py-2 pr-3 font-semibold">Closer</th>
                <th className="py-2 pr-3 font-semibold">Status</th>
                <th className="py-2 pr-3 font-semibold">Link</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.slice(0, 200).map((r, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-secondary/30">
                  <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{r.aba}</td>
                  <td className="py-2 pr-3 text-foreground">{r.agender}</td>
                  <td className="py-2 pr-3 text-foreground">{r.loja}</td>
                  <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{r.dataReuniao}</td>
                  <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{r.horario}</td>
                  <td className="py-2 pr-3 text-foreground">{r.closer}</td>
                  <td className="py-2 pr-3">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-md" style={{ background: `${STATUS_COLORS[r.status]}25`, color: STATUS_COLORS[r.status], border: `1px solid ${STATUS_COLORS[r.status]}55` }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLORS[r.status] }} />
                      {STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    {r.link ? (
                      <a href={r.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        <ExternalLink className="w-3 h-3" /> abrir
                      </a>
                    ) : "—"}
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">Sem registros</td></tr>
              )}
            </tbody>
          </table>
          {filtrados.length > 200 && (
            <p className="text-[10px] text-muted-foreground text-center mt-2">Mostrando 200 de {filtrados.length} — use os filtros para refinar</p>
          )}
        </div>
        </>)}
      </section>

      {/* Gráficos do GERAL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="glass-card p-4">
          <h3 className="font-heading font-bold text-foreground text-base mb-3">Receita Anual</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={geral?.receitaAnual ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatCurrencyBR(v)} />
                <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="glass-card p-4">
          <h3 className="font-heading font-bold text-foreground text-base mb-3">Vendas por Mês</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={geral?.vendasAnual ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="valor" fill="hsl(var(--accent))" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="glass-card p-4">
          <h3 className="font-heading font-bold text-foreground text-base mb-3">Receita por Produto</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={geral?.receitaPorProduto ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <YAxis dataKey="produto" type="category" stroke="hsl(var(--muted-foreground))" fontSize={10} width={110} />
                <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatCurrencyBR(v)} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0,6,6,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="glass-card p-4">
          <h3 className="font-heading font-bold text-foreground text-base mb-3">Pagamento por Canal</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={(geral?.pagtoPorCanal ?? []).filter(p => p.total > 0)} dataKey="total" nameKey="metodo" cx="50%" cy="50%" outerRadius={80} label>
                  {(geral?.pagtoPorCanal ?? []).map((_, i) => (
                    <Cell key={i} fill={["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--success))", "hsl(var(--warning))"][i % 4]} />
                  ))}
                </Pie>
                <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatCurrencyBR(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Reuniões por Agender (mês vigente) */}
      <section className="glass-card p-4">
        <h3 className="font-heading font-bold text-foreground text-base mb-3">Agenders — Mês Vigente</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2 pr-3 font-semibold">Agender</th>
                <th className="py-2 pr-3 font-semibold text-right">Agendamentos</th>
                <th className="py-2 pr-3 font-semibold text-right">Reuniões Feitas</th>
                <th className="py-2 pr-3 font-semibold text-right">Média</th>
                <th className="py-2 pr-3 font-semibold text-right">Vendas</th>
                <th className="py-2 pr-3 font-semibold text-right">Meta</th>
              </tr>
            </thead>
            <tbody>
              {(geral?.reunioesMaio ?? []).map((r, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2 pr-3 text-foreground font-semibold">{r.agender}</td>
                  <td className="py-2 pr-3 text-right text-muted-foreground tabular-nums">{r.agendamentos}</td>
                  <td className="py-2 pr-3 text-right text-foreground tabular-nums">{r.reunioesFeitas}</td>
                  <td className="py-2 pr-3 text-right text-muted-foreground tabular-nums">{r.media?.toFixed(2) ?? "—"}</td>
                  <td className="py-2 pr-3 text-right text-foreground tabular-nums">{r.vendas}</td>
                  <td className="py-2 pr-3 text-right text-muted-foreground tabular-nums">{r.meta ?? "—"}</td>
                </tr>
              ))}
              {(geral?.reunioesMaio ?? []).length === 0 && (
                <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">Sem dados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Closers — Mês Vigente */}
      <section className="glass-card p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-heading font-bold text-foreground text-base">Closer — Mês Vigente</h3>
          {geral?.closersTituloBloco && (
            <span className="text-xs text-muted-foreground">{geral.closersTituloBloco}</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2 pr-3 font-semibold">Closer</th>
                <th className="py-2 pr-3 font-semibold text-right">N° de reunião</th>
                <th className="py-2 pr-3 font-semibold text-right">N° de vendas</th>
                <th className="py-2 pr-3 font-semibold text-right">Média</th>
                <th className="py-2 pr-3 font-semibold text-right">Meta</th>
              </tr>
            </thead>
            <tbody>
              {(geral?.closersMesVigente ?? []).map((r, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2 pr-3 text-foreground font-semibold">{r.closer}</td>
                  <td className="py-2 pr-3 text-right text-foreground tabular-nums">{r.reunioes}</td>
                  <td className="py-2 pr-3 text-right text-foreground tabular-nums">{r.vendas}</td>
                  <td className="py-2 pr-3 text-right text-muted-foreground tabular-nums">
                    {r.media === null ? "—" : r.media.toFixed(2)}
                  </td>
                  <td className="py-2 pr-3 text-right text-muted-foreground tabular-nums">{r.meta ?? "—"}</td>
                </tr>
              ))}
              {(geral?.closersMesVigente ?? []).length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">Sem dados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Base de Vendas */}
      <section className="glass-card p-4">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h3 className="font-heading font-bold text-foreground text-base">Base de Vendas</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <Popover open={mesPickerBaseOpen} onOpenChange={setMesPickerBaseOpen}>
              <PopoverTrigger asChild>
                <button
                  className="flex items-center gap-2 text-xs bg-secondary text-foreground rounded-md px-2.5 h-9 border border-border hover:bg-secondary/70 min-w-[140px] justify-between"
                >
                  <span className="truncate">
                    {filtroMesesBase.length === 0
                      ? "Todos os meses"
                      : filtroMesesBase.length === 1
                        ? filtroMesesBase[0]
                        : `${filtroMesesBase.length} meses`}
                  </span>
                  <ChevronsUpDown className="w-3 h-3 opacity-50 shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-56" align="start">
                <Command>
                  <CommandInput placeholder="Pesquisar mês..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>Nenhum mês encontrado</CommandEmpty>
                    <CommandGroup>
                      <CommandItem value="todos os meses" onSelect={() => setFiltroMesesBase([])}>
                        <Check className={cn("mr-2 h-4 w-4", filtroMesesBase.length === 0 ? "opacity-100" : "opacity-0")} />
                        Todos os meses
                      </CommandItem>
                      {Array.from(new Set((geral?.base ?? []).map(b => `${b.mes}${b.ano ? "/" + b.ano : ""}`)))
                        .filter(Boolean)
                        .map(m => {
                          const checked = filtroMesesBase.includes(m);
                          return (
                            <CommandItem
                              key={m}
                              value={m}
                              onSelect={() => {
                                setFiltroMesesBase(prev =>
                                  prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
                                );
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", checked ? "opacity-100" : "opacity-0")} />
                              {m}
                            </CommandItem>
                          );
                        })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <input
              type="text"
              value={buscaBase}
              onChange={(e) => setBuscaBase(e.target.value)}
              placeholder="Pesquisar empresa, cliente, closer..."
              className="h-9 w-full sm:w-72 rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2 pr-3 font-semibold">Empresa</th>
                <th className="py-2 pr-3 font-semibold">Produto</th>
                <th className="py-2 pr-3 font-semibold">Cliente</th>
                <th className="py-2 pr-3 font-semibold">Mês</th>
                <th className="py-2 pr-3 font-semibold">Pgto</th>
                <th className="py-2 pr-3 font-semibold">Closer</th>
                <th className="py-2 pr-3 font-semibold text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const q = buscaBase.trim().toLowerCase();
                const baseFiltrada = (geral?.base ?? []).filter((b) => {
                  const mesAno = `${b.mes}${b.ano ? "/" + b.ano : ""}`;
                  if (filtroMesesBase.length > 0 && !filtroMesesBase.includes(mesAno)) return false;
                  if (!q) return true;
                  return [b.empresa, b.produto, b.cliente, b.mes, b.formaPagto, b.closer]
                    .filter(Boolean)
                    .some((v) => String(v).toLowerCase().includes(q));
                });
                if (baseFiltrada.length === 0) {
                  return (
                    <tr><td colSpan={7} className="py-4 text-center text-muted-foreground">Sem dados</td></tr>
                  );
                }
                return baseFiltrada.map((b, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 pr-3 text-foreground">{b.empresa}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{b.produto}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{b.cliente}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{b.mes}/{b.ano ?? ""}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{b.formaPagto}</td>
                    <td className="py-2 pr-3 text-foreground">{b.closer}</td>
                    <td className="py-2 pr-3 text-right text-foreground font-semibold tabular-nums">{formatCurrencyBR(b.total)}</td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default ComercialSalvadorContent;
