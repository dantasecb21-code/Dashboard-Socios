import { useState, useMemo } from "react";
import { Estrategia } from "@/services/estrategiasService";
import { format, differenceInDays, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarIcon, ChevronDown, ChevronUp, Users, X, TableProperties, Gauge, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import GestorVelocityRanking from "./GestorVelocityRanking";

interface Props {
  estrategias: Estrategia[];
}

interface GestorStats {
  nome: string;
  total: number;
  emAndamento: number;
  aguardandoAprovacao: number;
  concluidas: number;
  atrasadas: number;
  taxaNoPrazo: number;
  tempoMedio: number | null;
  tempoCriacao: number | null;
  estrategias: Estrategia[];
}

const GestorPerformance = ({ estrategias }: Props) => {
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [plataforma, setPlataforma] = useState("todas");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [tipoFilter, setTipoFilter] = useState<string[]>([]);
  const [expandedGestor, setExpandedGestor] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<keyof GestorStats>("total");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [activeTab, setActiveTab] = useState<"tabela" | "ranking">("tabela");

  const plataformas = useMemo(() => {
    const set = new Set(estrategias.map((e) => e.plataforma).filter(Boolean));
    return Array.from(set).sort();
  }, [estrategias]);

  const statusOptions = useMemo(() => {
    const set = new Set(estrategias.map((e) => e.statusOperacional).filter(Boolean));
    return Array.from(set).sort();
  }, [estrategias]);

  const tipoOptions = useMemo(() => {
    const set = new Set(estrategias.map((e) => e.tipoEstrategia).filter(Boolean));
    return Array.from(set).sort();
  }, [estrategias]);

  const filtered = useMemo(() => {
    return estrategias.filter((e) => {
      if (plataforma !== "todas" && e.plataforma !== plataforma) return false;
      if (statusFilter !== "todos" && e.statusOperacional !== statusFilter) return false;
      if (tipoFilter.length > 0 && !tipoFilter.includes(e.tipoEstrategia || "")) return false;
      if (dateFrom || dateTo) {
        const created = e.dataCriacao ? parseISO(e.dataCriacao) : null;
        if (!created) return false;
        if (dateFrom && created < dateFrom) return false;
        if (dateTo) {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59, 999);
          if (created > end) return false;
        }
      }
      return true;
    });
  }, [estrategias, plataforma, statusFilter, tipoFilter, dateFrom, dateTo]);

  const gestorStats = useMemo(() => {
    const map = new Map<string, Estrategia[]>();
    filtered.forEach((e) => {
      const gestor = e.gestorOperacional?.trim() || "Sem gestor";
      if (!map.has(gestor)) map.set(gestor, []);
      map.get(gestor)!.push(e);
    });

    const stats: GestorStats[] = Array.from(map.entries()).map(([nome, list]) => {
      const concluidas = list.filter((e) => e.statusOperacional === "Concluída");
      const concluidasNoPrazo = concluidas.filter((e) => e.statusPrazo === "No prazo");

      const tempos = concluidas
        .map((e) => {
          if (e.dataInicio && e.dataConclusao) {
            return differenceInDays(parseISO(e.dataConclusao), parseISO(e.dataInicio));
          }
          return null;
        })
        .filter((t): t is number => t !== null && t >= 0);

      const criacaoTempos = list
        .filter((e) => e.dataCriacaoLoja && e.dataCriacao)
        .map((e) => differenceInDays(parseISO(e.dataCriacao!), parseISO(e.dataCriacaoLoja!)))
        .filter((t) => t >= 0);

      return {
        nome,
        total: list.length,
        emAndamento: list.filter((e) => e.statusOperacional === "Em andamento").length,
        aguardandoAprovacao: list.filter((e) => e.statusOperacional === "Aguardando aprovação").length,
        concluidas: concluidas.length,
        atrasadas: list.filter((e) => e.statusPrazo === "Atrasada").length,
        taxaNoPrazo: concluidas.length > 0 ? Math.round((concluidasNoPrazo.length / concluidas.length) * 100) : -1,
        tempoMedio: tempos.length > 0 ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length) : null,
        tempoCriacao: criacaoTempos.length > 0 ? Math.round(criacaoTempos.reduce((a, b) => a + b, 0) / criacaoTempos.length) : null,
        estrategias: list,
      };
    });

    stats.sort((a, b) => {
      const aVal = a[sortBy] ?? -1;
      const bVal = b[sortBy] ?? -1;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return stats;
  }, [filtered, sortBy, sortDir]);

  const handleSort = (col: keyof GestorStats) => {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
  };

  const clearFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setPlataforma("todas");
    setStatusFilter("todos");
    setTipoFilter([]);
  };

  const hasFilters = plataforma !== "todas" || statusFilter !== "todos" || tipoFilter.length > 0 || dateFrom || dateTo;

  const SortIcon = ({ col }: { col: keyof GestorStats }) => {
    if (sortBy !== col) return null;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />;
  };

  const taxaColor = (taxa: number) => {
    if (taxa < 0) return "text-muted-foreground";
    if (taxa >= 80) return "text-emerald-400";
    if (taxa >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Performance por Gestor
          </h2>
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground">
            <X className="w-3 h-3 mr-1" /> Limpar filtros
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {/* Período De */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("justify-start text-left text-xs font-normal h-9", !dateFrom && "text-muted-foreground")}>
              <CalendarIcon className="w-3 h-3 mr-1.5" />
              {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "De"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} locale={ptBR} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        {/* Período Até */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("justify-start text-left text-xs font-normal h-9", !dateTo && "text-muted-foreground")}>
              <CalendarIcon className="w-3 h-3 mr-1.5" />
              {dateTo ? format(dateTo, "dd/MM/yyyy") : "Até"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={ptBR} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        {/* Plataforma */}
        <Select value={plataforma} onValueChange={setPlataforma}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Plataforma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas plataformas</SelectItem>
            {plataformas.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos status</SelectItem>
            {statusOptions.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tipo de estratégia - multi-select */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs col-span-2 lg:col-span-1 justify-between font-normal"
            >
              <span className="truncate">
                {tipoFilter.length === 0
                  ? "Todos tipos"
                  : tipoFilter.length === 1
                  ? tipoFilter[0]
                  : `${tipoFilter.length} tipos selecionados`}
              </span>
              <ChevronDown className="w-3 h-3 ml-1 opacity-60 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
              <span className="text-xs font-medium">Tipos</span>
              {tipoFilter.length > 0 && (
                <button
                  onClick={() => setTipoFilter([])}
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                >
                  Limpar
                </button>
              )}
            </div>
            <ScrollArea className="h-64">
              <div className="p-1">
                {tipoOptions.map((t) => {
                  const checked = tipoFilter.includes(t);
                  return (
                    <label
                      key={t}
                      className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-accent/50 text-xs"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          setTipoFilter((prev) =>
                            v ? [...prev, t] : prev.filter((x) => x !== t)
                          );
                        }}
                      />
                      <span className="flex-1 truncate">{t}</span>
                    </label>
                  );
                })}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-border/40 pb-0">
        <button
          onClick={() => setActiveTab("tabela")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px",
            activeTab === "tabela"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <TableProperties className="w-3.5 h-3.5" /> Tabela Detalhada
        </button>
        <button
          onClick={() => setActiveTab("ranking")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px",
            activeTab === "ranking"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Gauge className="w-3.5 h-3.5" /> Ranking de Velocidade
        </button>
      </div>

      {activeTab === "ranking" ? (
        <GestorVelocityRanking estrategias={filtered} />
      ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-border/40 text-muted-foreground">
              {[
                { key: "nome" as keyof GestorStats, label: "GESTOR" },
                { key: "total" as keyof GestorStats, label: "TOTAL" },
                { key: "emAndamento" as keyof GestorStats, label: "ANDAMENTO" },
                { key: "aguardandoAprovacao" as keyof GestorStats, label: "AG. APROVAÇÃO" },
                { key: "concluidas" as keyof GestorStats, label: "CONCLUÍDAS" },
                { key: "atrasadas" as keyof GestorStats, label: "ATRASADAS" },
                { key: "taxaNoPrazo" as keyof GestorStats, label: "NO PRAZO" },
                { key: "tempoMedio" as keyof GestorStats, label: "T. EXECUÇÃO" },
                { key: "tempoCriacao" as keyof GestorStats, label: "T. CRIAÇÃO" },
              ].map(({ key, label }) => (
                <th
                  key={key}
                  className="py-2 px-2 text-left font-medium cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                  onClick={() => handleSort(key)}
                >
                  {label} <SortIcon col={key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gestorStats.map((g) => (
              <>
                <tr
                  key={g.nome}
                  className={cn(
                    "border-b border-border/20 cursor-pointer transition-colors hover:bg-accent/30",
                    expandedGestor === g.nome && "bg-accent/20"
                  )}
                  onClick={() => setExpandedGestor(expandedGestor === g.nome ? null : g.nome)}
                >
                  <td className="py-2.5 px-2 font-medium text-foreground flex items-center gap-1.5">
                    {expandedGestor === g.nome ? <ChevronUp className="w-3.5 h-3.5 text-primary" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                    {g.nome}
                  </td>
                  <td className="py-2.5 px-2 font-semibold text-foreground">{g.total}</td>
                  <td className="py-2.5 px-2 text-blue-400">{g.emAndamento}</td>
                  <td className="py-2.5 px-2 text-amber-400">{g.aguardandoAprovacao}</td>
                  <td className="py-2.5 px-2 text-emerald-400">{g.concluidas}</td>
                  <td className="py-2.5 px-2 text-red-400">{g.atrasadas}</td>
                  <td className={cn("py-2.5 px-2 font-medium", taxaColor(g.taxaNoPrazo))}>
                    {g.taxaNoPrazo < 0 ? "—" : `${g.taxaNoPrazo}%`}
                  </td>
                  <td className="py-2.5 px-2 text-muted-foreground">
                    {g.tempoMedio !== null ? `${g.tempoMedio}d` : "—"}
                  </td>
                  <td className="py-2.5 px-2 text-muted-foreground">
                    {g.tempoCriacao !== null ? `${g.tempoCriacao}d` : "—"}
                  </td>
                </tr>

                {expandedGestor === g.nome && (
                  <tr key={`${g.nome}-detail`}>
                    <td colSpan={9} className="p-0">
                      <div className="bg-accent/10 border-l-2 border-primary/50 p-3 space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          {g.estrategias.length} estratégia(s) de {g.nome}
                        </p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-muted-foreground border-b border-border/30">
                                <th className="py-1.5 px-2 text-left font-medium">LOJA</th>
                                <th className="py-1.5 px-2 text-left font-medium">PLATAFORMA</th>
                                <th className="py-1.5 px-2 text-left font-medium">TIPO</th>
                                <th className="py-1.5 px-2 text-left font-medium">STATUS</th>
                                <th className="py-1.5 px-2 text-left font-medium">PRAZO</th>
                                <th className="py-1.5 px-2 text-left font-medium">DEADLINE</th>
                                <th className="py-1.5 px-2 text-left font-medium">CONCLUSÃO</th>
                                <th className="py-1.5 px-2 text-left font-medium">T. CRIAÇÃO</th>
                                <th className="py-1.5 px-2 text-left font-medium">T. EXECUÇÃO</th>
                              </tr>
                            </thead>
                            <tbody>
                              {g.estrategias.map((e) => (
                                <tr key={e.id} className="border-b border-border/10 hover:bg-accent/20">
                                  <td className="py-1.5 px-2 text-foreground">{e.loja}</td>
                                  <td className="py-1.5 px-2">
                                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", e.plataforma === "iFood" ? "border-red-500/40 text-red-400" : "border-yellow-500/40 text-yellow-400")}>
                                      {e.plataforma}
                                    </Badge>
                                  </td>
                                  <td className="py-1.5 px-2 text-muted-foreground">{e.tipoEstrategia || "—"}</td>
                                  <td className="py-1.5 px-2">
                                    <StatusBadge status={e.statusOperacional} />
                                  </td>
                                  <td className="py-1.5 px-2">
                                    <PrazoBadge prazo={e.statusPrazo} />
                                  </td>
                                  <td className="py-1.5 px-2 text-muted-foreground whitespace-nowrap">
                                    {e.dataEntregaPrevista ? format(parseISO(e.dataEntregaPrevista), "dd/MM/yyyy") : "—"}
                                  </td>
                                  <td className="py-1.5 px-2 text-muted-foreground whitespace-nowrap">
                                    {e.dataConclusao ? format(parseISO(e.dataConclusao), "dd/MM/yyyy") : "—"}
                                  </td>
                                  <td className="py-1.5 px-2 text-muted-foreground whitespace-nowrap">
                                    {e.dataCriacaoLoja && e.dataCriacao ? `${differenceInDays(parseISO(e.dataCriacao), parseISO(e.dataCriacaoLoja))}d` : "—"}
                                  </td>
                                  <td className="py-1.5 px-2 text-muted-foreground whitespace-nowrap">
                                    {e.dataInicio && e.dataConclusao ? `${differenceInDays(parseISO(e.dataConclusao), parseISO(e.dataInicio))}d` : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {gestorStats.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center text-muted-foreground text-sm">
                  Nenhuma estratégia encontrada com os filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
};

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    "Em andamento": "bg-blue-500/20 text-blue-400",
    "Concluída": "bg-emerald-500/20 text-emerald-400",
    "Aprovada": "bg-green-500/20 text-green-400",
    "Aguardando aprovação": "bg-amber-500/20 text-amber-400",
    "Cancelada": "bg-red-500/20 text-red-300",
    "Pendente": "bg-gray-500/20 text-gray-400",
  };
  return (
    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap", colors[status] || "bg-gray-500/20 text-gray-400")}>
      {status}
    </span>
  );
}

function PrazoBadge({ prazo }: { prazo: string }) {
  const colors: Record<string, string> = {
    "No prazo": "text-emerald-400",
    "Atrasada": "text-red-400",
    "Vencendo": "text-amber-400",
  };
  return <span className={cn("text-[10px] font-medium", colors[prazo] || "text-muted-foreground")}>{prazo || "—"}</span>;
}

export default GestorPerformance;
