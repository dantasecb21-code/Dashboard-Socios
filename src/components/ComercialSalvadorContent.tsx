import { useMemo, useState } from "react";
import { useComercialSalvador } from "@/hooks/useComercialSalvador";
import { STATUS_LABELS, STATUS_COLORS, AgendamentoStatus } from "@/services/comercialSalvadorService";
import KpiCard from "./KpiCard";
import {
  CalendarCheck, Users, XCircle, TrendingUp, Filter,
  Check, ChevronsUpDown, ChevronDown, Download,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip as RTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

const STATUS_ORDER: AgendamentoStatus[] = ["reuniao_feita", "venda_feita", "em_atendimento_closer", "a_fazer", "cancelado"];

const ComercialSalvadorContent = () => {
  const { data, isLoading } = useComercialSalvador();

  const [filtroAgender, setFiltroAgender] = useState<string>("TODOS");
  const [filtroCloser, setFiltroCloser] = useState<string>("TODOS");
  const [filtroStatus, setFiltroStatus] = useState<AgendamentoStatus | "TODOS">("TODOS");
  const [filtroProduto, setFiltroProduto] = useState<string>("TODOS");
  const [busca, setBusca] = useState("");
  const [tabelaOpen, setTabelaOpen] = useState(true);
  const [agenderPickerOpen, setAgenderPickerOpen] = useState(false);
  const [closerPickerOpen, setCloserPickerOpen] = useState(false);

  const registros = data?.registros ?? [];

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

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return registros.filter(r => {
      if (filtroAgender !== "TODOS" && r.agender !== filtroAgender) return false;
      if (filtroCloser !== "TODOS" && r.closer !== filtroCloser) return false;
      if (filtroStatus !== "TODOS" && r.status !== filtroStatus) return false;
      if (filtroProduto !== "TODOS" && r.produto !== filtroProduto) return false;
      if (q && ![r.nomeLoja, r.proprietario, r.agender, r.closer, r.telefone, r.produto]
        .some(v => v.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [registros, filtroAgender, filtroCloser, filtroStatus, filtroProduto, busca]);

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

  const pieData = useMemo(() =>
    STATUS_ORDER
      .filter(s => statusCount[s] > 0)
      .map(s => ({ name: STATUS_LABELS[s], value: statusCount[s], color: STATUS_COLORS[s] })),
    [statusCount]
  );

  const reunioesFeitasTotal = statusCount["reuniao_feita"] + (statusCount["venda_feita"] ?? 0);

  if (isLoading && registros.length === 0) {
    return <div className="text-muted-foreground text-sm">Carregando dados...</div>;
  }

  return (
    <div className="space-y-6">
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
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
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
                  <Bar dataKey="reunioes" name="Reuniões" fill="hsl(var(--primary))" radius={[0,4,4,0]} />
                  <Bar dataKey="cancelados" name="Cancelados" fill="hsl(0 65% 55%)" radius={[0,4,4,0]} />
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
                    <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{r.dataAgendamento}</td>
                    <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{r.dataReuniao}</td>
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
  );
};

export default ComercialSalvadorContent;
