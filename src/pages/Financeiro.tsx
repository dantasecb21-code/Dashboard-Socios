import { useState, useMemo } from "react";
import PrevisaoExportModal from "@/components/PrevisaoExportModal";
import { useNavigate } from "react-router-dom";
import {
  DollarSign, TrendingDown, Wallet, Sun, Moon,
  ChevronLeft, AlertTriangle, Store, Ban, Search, RefreshCw, ChevronUp, ChevronDown,
  CalendarRange, Download, Info,
} from "lucide-react";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { exportToExcel } from "@/lib/excelExport";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import KpiCard from "@/components/KpiCard";
import ChannelBreakdown from "@/components/ChannelBreakdown";
import { useTheme } from "@/hooks/use-theme";
import { useFinanceiro } from "@/hooks/useFinanceiro";
import { FinanceiroClient, formatCurrencyBR, getMonthLabel, isClienteEmAtraso, getValorAtrasoEfetivo, isEmCancelamento } from "@/data/financeiro";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Filter, X } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";

const REGIONS = ["GERAL", "SÃO PAULO", "SALVADOR"] as const;
type Region = (typeof REGIONS)[number];

const STATUS_COLORS: Record<string, string> = {
  PAGO: "hsl(160 84% 39%)",
  "A PAGAR": "hsl(217 91% 60%)",
  "ATRASO DO MÊS": "hsl(36 100% 57%)",
  ATRASADO: "hsl(25 95% 53%)",
  CANCELADO: "hsl(0 72% 55%)",
  "SEM RESULTADO": "hsl(215 14% 55%)",
  PAUSADO: "hsl(215 16% 42%)",
  "EM CANCELAMENTO": "hsl(350 80% 58%)",
  "EM CANCELAMENTO/ATRASADO": "hsl(15 85% 55%)",
  "EM CANCELAMENTO/PAGO": "hsl(28 90% 60%)",
  ACORDO: "hsl(199 89% 48%)",
  "NÃO COBRAR": "hsl(262 70% 58%)",
  "NOVO CLIENTE": "hsl(172 66% 50%)",
  PENDÊNCIA: "hsl(45 93% 47%)",
  SINAL: "hsl(280 67% 60%)",
  INATIVO: "hsl(215 14% 38%)",
};

const SITUACAO_BADGE: Record<string, string> = {
  PAGO: "bg-success/15 text-success",
  "A PAGAR": "bg-info/15 text-info",
  "ATRASO DO MÊS": "bg-warning/15 text-warning",
  ATRASADO: "bg-destructive/15 text-destructive",
  CANCELADO: "bg-destructive/10 text-destructive/70",
  PAUSADO: "bg-muted text-muted-foreground",
  "EM CANCELAMENTO": "bg-destructive/15 text-destructive",
  "EM CANCELAMENTO/ATRASADO": "bg-destructive/20 text-destructive",
  "EM CANCELAMENTO/PAGO": "bg-warning/20 text-warning",
  PENDÊNCIA: "bg-warning/10 text-warning",
  INATIVO: "bg-muted text-muted-foreground",
  ACORDO: "bg-info/10 text-info",
  "NOVO CLIENTE": "bg-success/10 text-success",
  "NÃO COBRAR": "bg-muted text-muted-foreground",
  "SEM RESULTADO": "bg-muted text-muted-foreground",
  SINAL: "bg-primary/10 text-primary",
};

const ALL_STATUSES = [
  "PAGO", "A PAGAR", "ATRASO DO MÊS", "ATRASADO", "NOVO CLIENTE", "SINAL",
  "ACORDO", "PENDÊNCIA", "EM CANCELAMENTO", "EM CANCELAMENTO/ATRASADO",
  "EM CANCELAMENTO/PAGO", "CANCELADO", "PAUSADO", "INATIVO", "NÃO COBRAR", "SEM RESULTADO",
];

type SortKey = "empresa" | "valorFixo" | "situacao" | "gestao" | "estado" | "qtdMeses" | "valorAtrasado";

const Financeiro = () => {
  const [region, setRegion] = useState<Region>("GERAL");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("empresa");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [forecastStart, setForecastStart] = useState<number>(1);
  const [forecastSearch, setForecastSearch] = useState("");
  const [forecastFilter, setForecastFilter] = useState<"TODOS" | "A PAGAR" | "PAGO" | "ATRASO" | "OUTROS">("TODOS");
  const [forecastEnd, setForecastEnd] = useState<number>(15);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"excel" | "pdf">("excel");
  const [atrasoTodos, setAtrasoTodos] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const { data: finData, isLoading, isFetching, refetch } = useFinanceiro();
  const allClients = finData?.clients ?? [];

  const filtered = useMemo(() => {
    let list = allClients;
    if (region === "SÃO PAULO") list = list.filter(c => c.regiao === "SP");
    else if (region === "SALVADOR") list = list.filter(c => c.regiao === "SSA");

    if (statusFilter.length > 0) {
      list = list.filter(c => statusFilter.includes(c.situacao));
    }


    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.empresa.toLowerCase().includes(q) ||
        c.cliente.toLowerCase().includes(q) ||
        c.situacao.toLowerCase().includes(q) ||
        c.gestao.toLowerCase().includes(q) ||
        c.closer.toLowerCase().includes(q) ||
        c.estado.toLowerCase().includes(q) ||
        c.cnpj.toLowerCase().includes(q)
      );
    }

    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "empresa") cmp = a.empresa.localeCompare(b.empresa);
      else if (sortKey === "valorFixo") cmp = a.valorFixo - b.valorFixo;
      else if (sortKey === "situacao") cmp = a.situacao.localeCompare(b.situacao);
      else if (sortKey === "gestao") cmp = a.gestao.localeCompare(b.gestao);
      else if (sortKey === "estado") cmp = a.estado.localeCompare(b.estado);
      else if (sortKey === "qtdMeses") cmp = a.qtdMeses - b.qtdMeses;
      else if (sortKey === "valorAtrasado") cmp = getValorAtrasoEfetivo(a) - getValorAtrasoEfetivo(b);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [allClients, region, search, sortKey, sortDir, statusFilter]);

  const totalClients = filtered.length;
  const activeRevenueStatuses = ["PAGO", "NOVO CLIENTE", "A PAGAR", "ATRASADO", "ATRASO DO MÊS", "SINAL", "ACORDO"];
  const paidClients = filtered.filter(c => activeRevenueStatuses.includes(c.situacao));

  // Usa resumos da planilha quando sem filtro de busca
  const summaries = finData?.summaries;
  const summaryKey = region === "SÃO PAULO" ? "sp" : region === "SALVADOR" ? "ssa" : "geral";
  const useSummary = !search.trim() && statusFilter.length === 0 && summaries;

  const totalRevenue = useSummary
    ? summaries[summaryKey].receitaAtiva
    : filtered.filter(c => c.situacao === "PAGO").reduce((sum, client) => sum + client.valorFixo, 0);

  const receitaMensal = useSummary
    ? summaries[summaryKey].receitaMensal
    : paidClients.reduce((sum, client) => sum + client.valorFixo, 0);

  const emCancelamentoTotal = useSummary
    ? summaries[summaryKey].emCancelamento
    : filtered.filter(isEmCancelamento).reduce((sum, client) => sum + client.valorFixo, 0);
  const overdue = filtered.filter(isClienteEmAtraso).length;
  const pending = filtered.filter(c => ["PENDÊNCIA", "A PAGAR"].includes(c.situacao)).length;
  const inactive = filtered.filter(c => ["INATIVO", "CANCELADO"].includes(c.situacao)).length;

  // Status chart
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach(c => { counts[c.situacao] = (counts[c.situacao] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  // Monthly revenue
  const currentYear = new Date().getFullYear().toString();
  const monthlyData = useMemo(() => {
    const monthly: Record<string, number> = {};
    filtered.forEach(c => {
      for (const [k, v] of Object.entries(c.pagamentosMensais)) {
        if (k.startsWith(currentYear)) {
          monthly[k] = (monthly[k] || 0) + v;
        }
      }
    });
    return Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => ({ month: getMonthLabel(key), revenue: value }));
  }, [filtered, currentYear]);

  // Gestao chart
  const gestaoData = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach(c => { const g = c.gestao || "INDEFINIDO"; counts[g] = (counts[g] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [filtered]);

  // Previsão de receita por período (baseada no DIA DE PAGAMENTO da planilha)
  const forecastStatuses = ["A PAGAR", "PAGO", "NOVO CLIENTE", "ATRASO DO MÊS", "ATRASADO", "SINAL", "ACORDO"];
  const forecastData = useMemo(() => {
    const lo = Math.min(forecastStart, forecastEnd);
    const hi = Math.max(forecastStart, forecastEnd);
    const list = filtered.filter(c =>
      forecastStatuses.includes(c.situacao) &&
      c.diaPagamento >= lo &&
      c.diaPagamento <= hi
    );
    const aPagar = list.filter(c => c.situacao === "A PAGAR").reduce((s, c) => s + c.valorFixo, 0);
    const pago = list.filter(c => c.situacao === "PAGO").reduce((s, c) => s + c.valorFixo, 0);
    const atrasado = list.filter(isClienteEmAtraso).reduce((s, c) => s + getValorAtrasoEfetivo(c), 0);
    // Demais situações (NOVO CLIENTE, SINAL, ACORDO etc.) entram 100%
    const outros = list
      .filter(c => c.situacao !== "A PAGAR" && !isClienteEmAtraso(c))
      .reduce((s, c) => s + c.valorFixo, 0);
    // Total previsto: tudo o que já tinha, mas A PAGAR conta 70% e ATRASADO conta 15%
    const total = outros + aPagar * 0.7 + atrasado * 0.15;
    const pendenciaTotal = filtered
      .filter(c => c.situacao === "PENDÊNCIA")
      .reduce((s, c) => s + c.valorFixo, 0);
    return { list, total, aPagar, pago, atrasado, pendenciaTotal, count: list.length };
  }, [filtered, forecastStart, forecastEnd]);

  // Em atraso total (independente do dia de pagamento) — controlado pelo "disjuntor"
  const atrasoAll = useMemo(() => {
    const list = filtered.filter(isClienteEmAtraso);
    const valor = list.reduce((s, c) => s + getValorAtrasoEfetivo(c), 0);
    return { list, valor, count: list.length };
  }, [filtered]);

  const atrasoValorExibido = atrasoTodos ? atrasoAll.valor : forecastData.atrasado;

  const FORECAST_PRESETS: Array<[number, number, string]> = [
    [1, 5, "01-05"], [1, 10, "01-10"], [1, 15, "01-15"],
    [16, 20, "16-20"], [16, 25, "16-25"], [16, 31, "16-31"],
    [1, 31, "Mês todo"],
  ];


  const isDark = document.documentElement.classList.contains("dark");
  const tooltipBg = isDark ? "hsl(230 13% 14%)" : "hsl(0 0% 100%)";
  const tooltipBorder = isDark ? "hsl(230 10% 22%)" : "hsl(220 13% 87%)";
  const tooltipColor = isDark ? "hsl(0 0% 95%)" : "hsl(230 15% 12%)";
  const gridColor = isDark ? "hsl(230 10% 18%)" : "hsl(220 13% 90%)";
  const tickColor = isDark ? "hsl(0 0% 60%)" : "hsl(220 8% 46%)";
  const strokeColor = isDark ? "hsl(230 15% 8%)" : "hsl(0 0% 100%)";

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />;
  };

  const noData = allClients.length === 0 && !isLoading;

  return (
    <div className="min-h-screen bg-background bg-grid">
      <div className="fixed inset-0 bg-radial-glow pointer-events-none" />
      <div className="relative flex">
        <AppSidebar />
        <div className="flex-1 min-w-0 md:pl-[68px]">

      <header className="sticky top-0 z-50 border-b border-primary/15 bg-background/90">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2.5">
              <button onClick={() => navigate("/")} className="w-8 h-8 rounded-lg bg-secondary border border-border hover:bg-muted transition-colors flex items-center justify-center" aria-label="Voltar">
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </button>
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-heading font-bold text-foreground">Dashboard Financeiro</h1>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground tracking-wider uppercase leading-none mt-0.5">Receitas & Situação Financeira</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button onClick={() => refetch()} disabled={isFetching} className="w-9 h-9 rounded-lg flex items-center justify-center bg-secondary border border-border hover:bg-muted transition-colors disabled:opacity-50" aria-label="Atualizar">
                <RefreshCw className={`w-4 h-4 text-muted-foreground ${isFetching ? "animate-spin" : ""}`} />
              </button>
              <button onClick={toggle} className="w-9 h-9 rounded-lg flex items-center justify-center bg-secondary border border-border hover:bg-muted transition-colors" aria-label="Tema">
                {theme === "dark" ? <Sun className="w-4 h-4 text-warning" /> : <Moon className="w-4 h-4 text-primary" />}
              </button>
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 border border-success/20">
                <div className={`w-1.5 h-1.5 rounded-full ${isFetching ? "bg-warning animate-pulse" : "bg-success animate-pulse"}`} />
                <span className={`text-[10px] font-semibold ${isFetching ? "text-warning" : "text-success"}`}>{isFetching ? "Atualizando..." : "Ao vivo"}</span>
              </div>
              <span className="hidden sm:inline text-xs text-muted-foreground">
                {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-0 -mb-px overflow-x-auto scrollbar-none pb-px">
            {REGIONS.map(tab => (
              <button key={tab} onClick={() => setRegion(tab)} className={`px-2.5 sm:px-3 md:px-4 py-2 sm:py-2.5 text-[9px] sm:text-[10px] md:text-[11px] font-bold tracking-wider uppercase transition-all border-b-2 whitespace-nowrap shrink-0 ${region === tab ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className={`relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 ${isLoading ? "opacity-60" : ""}`}>
        {noData && (
          <div className="glass-card p-8 sm:p-12 text-center space-y-3">
            <Wallet className="w-12 h-12 text-muted-foreground/40 mx-auto" />
            <h2 className="text-lg font-heading font-bold text-foreground">Dashboard Financeiro</h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              Configure a URL do Google Apps Script em <code className="text-primary text-xs">src/services/financeiroService.ts</code> para conectar a planilha financeira e carregar os dados em tempo real.
            </p>
          </div>
        )}

        {!noData && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
              <KpiCard title="Total Serviços" value={totalClients} subtitle={`${paidClients.length} pagos`} icon={Store} variant="info" delay={0} />
              <KpiCard title="Receita Ativa" value={formatCurrencyBR(totalRevenue)} subtitle="Pago atual" icon={DollarSign} variant="success" delay={1} />
              <div className="relative min-w-0">
                <KpiCard title="Receita Mensal" value={formatCurrencyBR(receitaMensal)} subtitle="Total de clientes ativos" icon={Wallet} variant="success" delay={2} />
                {emCancelamentoTotal > 0 && (
                  <span className="absolute bottom-1.5 right-1.5 max-w-[70%] text-right text-[8px] sm:text-[9px] font-bold text-destructive whitespace-normal break-words [overflow-wrap:anywhere]">
                    Em canc. {formatCurrencyBR(emCancelamentoTotal)}
                  </span>
                )}
              </div>
              <KpiCard title="Inadimplentes" value={overdue} subtitle="Atraso ou atrasado" icon={AlertTriangle} variant="warning" delay={3} />
              <KpiCard title="Pendentes" value={pending} subtitle="A pagar + pendência" icon={TrendingDown} variant="destructive" delay={4} />
              <KpiCard title="Inativos" value={inactive} subtitle="Cancelados + inativos" icon={Ban} delay={5} />
            </div>


            {/* Previsão de Receita por Período (dia de pagamento) */}
            <div className="glass-card p-3 sm:p-4 lg:p-5 opacity-0 animate-fade-in" style={{ animationDelay: "0.15s" }}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3 sm:mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                    <CalendarRange className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-foreground text-xs sm:text-sm">Previsão de Receita por Período</h3>
                    <p className="text-[10px] text-muted-foreground">Baseado no dia de pagamento da planilha</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {FORECAST_PRESETS.map(([s, e, label]) => {
                    const active = forecastStart === s && forecastEnd === e;
                    return (
                      <button
                        key={label}
                        onClick={() => { setForecastStart(s as number); setForecastEnd(e as number); }}
                        className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-colors ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-muted"}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                  <div className="flex items-center gap-1 ml-1 px-2 py-1 rounded-md bg-secondary border border-border">
                    <span className="text-[10px] text-muted-foreground">Dia</span>
                    <input
                      type="number" min={1} max={31} value={forecastStart}
                      onChange={e => setForecastStart(Math.max(1, Math.min(31, Number(e.target.value) || 1)))}
                      className="w-10 bg-transparent text-[11px] text-foreground text-center focus:outline-none tabular-nums"
                    />
                    <span className="text-[10px] text-muted-foreground">até</span>
                    <input
                      type="number" min={1} max={31} value={forecastEnd}
                      onChange={e => setForecastEnd(Math.max(1, Math.min(31, Number(e.target.value) || 1)))}
                      className="w-10 bg-transparent text-[11px] text-foreground text-center focus:outline-none tabular-nums"
                    />
                  </div>
                  <button
                    onClick={() => { setExportFormat("excel"); setExportOpen(true); }}
                    className="h-8 px-2.5 rounded-md bg-success/15 text-success border border-success/30 hover:bg-success/25 text-[10px] font-bold flex items-center gap-1 whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" /> EXCEL
                  </button>
                  <button
                    onClick={() => { setExportFormat("pdf"); setExportOpen(true); }}
                    className="h-8 px-2.5 rounded-md bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25 text-[10px] font-bold flex items-center gap-1 whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" /> PDF
                  </button>
                </div>
              </div>

              {(() => {
                const lo = Math.min(forecastStart, forecastEnd);
                const hi = Math.max(forecastStart, forecastEnd);
                return (
                  <PrevisaoExportModal
                    open={exportOpen}
                    onOpenChange={setExportOpen}
                    rows={allClients}
                    region={region}
                    diaInicio={lo}
                    diaFim={hi}
                    filtro={forecastFilter}
                    key={exportFormat}
                    initialFormat={exportFormat}
                  />
                );
              })()}

              <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <div className="flex items-center gap-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total previsto</p>
                    <TooltipProvider delayDuration={150}>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3 h-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="start" className="z-[120] max-w-xs">
                          <b>Previsão ponderada de receita no período.</b><br />
                          Inclui todos os clientes (A PAGAR, PAGO, NOVO CLIENTE, ATRASO DO MÊS, ATRASADO, SINAL, ACORDO) cujo dia de pagamento está na faixa selecionada, mas com pesos:<br />
                          • <b>A pagar:</b> conta apenas <b>70%</b> (taxa histórica de pagamento em dia).<br />
                          • <b>Em atraso:</b> conta apenas <b>15%</b> (taxa de recuperação no período).<br />
                          • Demais situações entram com 100% do valor.
                        </TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-base sm:text-lg font-heading font-bold text-primary tabular-nums mt-1">{formatCurrencyBR(forecastData.total)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{forecastData.count} clientes (dia {Math.min(forecastStart, forecastEnd)}-{Math.max(forecastStart, forecastEnd)})</p>
                </div>
                <div className="rounded-lg border border-info/30 bg-info/5 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">A pagar</p>
                  <p className="text-base sm:text-lg font-heading font-bold text-info tabular-nums mt-1">{formatCurrencyBR(forecastData.aPagar)}</p>
                </div>
                <div className="rounded-lg border border-success/30 bg-success/5 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Já pago</p>
                  <p className="text-base sm:text-lg font-heading font-bold text-success tabular-nums mt-1">{formatCurrencyBR(forecastData.pago)}</p>
                </div>
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Em atraso</p>
                    <button
                      onClick={() => setAtrasoTodos(v => !v)}
                      title={atrasoTodos ? "Mostrando todos os atrasos (clique para usar a faixa de dias)" : "Restrito à faixa de dias selecionada (clique para mostrar todos)"}
                      className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${atrasoTodos ? "bg-warning" : "bg-muted"}`}
                    >
                      <span className={`inline-block h-3 w-3 transform rounded-full bg-background transition-transform ${atrasoTodos ? "translate-x-3.5" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                  <p className="text-base sm:text-lg font-heading font-bold text-warning tabular-nums mt-1">{formatCurrencyBR(atrasoValorExibido)}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{atrasoTodos ? `Todos (${atrasoAll.count})` : `Faixa dia ${Math.min(forecastStart, forecastEnd)}-${Math.max(forecastStart, forecastEnd)}`}</p>
                </div>
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <div className="flex items-center gap-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Pendência</p>
                    <TooltipProvider delayDuration={150}>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3 h-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="end" className="z-[120] max-w-xs">
                          Soma do <b>Valor Fixo</b> de todos os clientes com situação <b>PENDÊNCIA</b> na região ativa, <b>independente do dia de pagamento</b> ou faixa selecionada.
                        </TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-base sm:text-lg font-heading font-bold text-destructive tabular-nums mt-1">{formatCurrencyBR(forecastData.pendenciaTotal)}</p>
                </div>
              </div>

              {(forecastData.list.length > 0 || atrasoAll.list.length > 0) && (() => {
                const q = forecastSearch.trim().toLowerCase();
                const matchFilter = (s: string) => {
                  if (forecastFilter === "TODOS") return true;
                  if (forecastFilter === "A PAGAR") return s === "A PAGAR";
                  if (forecastFilter === "PAGO") return s === "PAGO" || s === "NOVO CLIENTE";
                  if (forecastFilter === "ATRASO") return s === "ATRASO DO MÊS" || s === "ATRASADO";
                  if (forecastFilter === "OUTROS") return !["A PAGAR", "PAGO", "NOVO CLIENTE", "ATRASO DO MÊS", "ATRASADO"].includes(s);
                  return true;
                };
                const sourceList = (atrasoTodos && forecastFilter === "ATRASO")
                  ? atrasoAll.list
                  : forecastData.list;
                const visible = [...sourceList]
                  .filter(c => matchFilter(c.situacao))
                  .filter(c => !q || c.empresa.toLowerCase().includes(q) || c.situacao.toLowerCase().includes(q) || c.cliente.toLowerCase().includes(q) || String(c.diaPagamento).includes(q))
                  .sort((a, b) => a.diaPagamento - b.diaPagamento);
                const FILTERS: Array<{ key: typeof forecastFilter; label: string; cls: string }> = [
                  { key: "TODOS", label: "Todos", cls: "bg-primary text-primary-foreground" },
                  { key: "A PAGAR", label: "A pagar", cls: "bg-info text-info-foreground" },
                  { key: "PAGO", label: "Já pago", cls: "bg-success text-success-foreground" },
                  { key: "ATRASO", label: "Em atraso", cls: "bg-warning text-warning-foreground" },
                  { key: "OUTROS", label: "Outros", cls: "bg-muted text-foreground" },
                ];
                return (
                <div className="mt-3 overflow-x-auto">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {FILTERS.map(f => (
                        <button
                          key={f.key}
                          onClick={() => setForecastFilter(f.key)}
                          className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-colors ${forecastFilter === f.key ? f.cls : "bg-secondary text-muted-foreground hover:bg-muted"}`}
                        >
                          {f.label}
                        </button>
                      ))}
                      <p className="text-[10px] text-muted-foreground ml-1">{visible.length} de {sourceList.length}</p>
                    </div>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        value={forecastSearch}
                        onChange={e => setForecastSearch(e.target.value)}
                        placeholder="Buscar empresa, situação, dia..."
                        className="w-full h-8 pl-8 pr-3 rounded-lg bg-secondary border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                    </div>
                  </div>
                  <div className="max-h-[480px] overflow-y-auto rounded-lg border border-border/40">
                  <table className="w-full text-[10px] sm:text-xs">
                    <thead className="sticky top-0 bg-background z-10">
                      <tr className="border-b border-border/50 text-muted-foreground">
                        <th className="text-left font-semibold uppercase tracking-wider py-1.5 px-2">Empresa</th>
                        <th className="text-left font-semibold uppercase tracking-wider py-1.5 px-2">Situação</th>
                        <th className="text-center font-semibold uppercase tracking-wider py-1.5 px-2">Dia pgto</th>
                        <th className="text-right font-semibold uppercase tracking-wider py-1.5 px-2">Valor</th>
                        <th className="text-left font-semibold uppercase tracking-wider py-1.5 px-2">Região</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((c, i) => (
                        <tr key={`fc-${c.empresa}-${i}`} className="border-b border-border/30 hover:bg-muted/30">
                          <td className="py-1.5 px-2 text-foreground font-medium max-w-[200px] truncate">{c.empresa}</td>
                          <td className="py-1.5 px-2">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${SITUACAO_BADGE[c.situacao] || "bg-muted text-muted-foreground"}`}>{c.situacao}</span>
                          </td>
                          <td className="py-1.5 px-2 text-center tabular-nums text-muted-foreground">{c.diaPagamento}</td>
                          <td className="py-1.5 px-2 text-right tabular-nums text-foreground font-semibold">{formatCurrencyBR(c.valorFixo)}</td>
                          <td className="py-1.5 px-2 text-muted-foreground">{c.regiao === "SP" ? "São Paulo" : "Salvador"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                  <p className="text-center text-[10px] text-muted-foreground py-2">Total: {visible.length} cliente{visible.length === 1 ? "" : "s"}</p>
                  {visible.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground py-6">Nenhum cliente encontrado.</p>
                  )}
                </div>
                );
              })()}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4">
              <div className="lg:col-span-2 glass-card p-3 sm:p-4 lg:p-5 opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
                <h3 className="font-heading font-bold text-foreground text-xs sm:text-sm mb-3 sm:mb-4">Distribuição por Status</h3>
                <div className="flex flex-col items-center gap-3 sm:gap-4">
                  <div className="h-[160px] w-[160px]">
                    <PieChart width={160} height={160}>
                      <Pie data={statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={72} paddingAngle={2} dataKey="value" stroke={strokeColor} strokeWidth={2}>
                        {statusData.map(e => <Cell key={e.name} fill={STATUS_COLORS[e.name] || "hsl(215 14% 38%)"} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: "8px", color: tooltipColor, fontSize: "12px", fontWeight: 500, padding: "6px 10px" }} />
                    </PieChart>
                  </div>
                  <div className="w-full grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {statusData.map(entry => (
                      <div key={entry.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[entry.name] || "hsl(215 14% 38%)" }} />
                          <span className="text-[10px] sm:text-xs text-muted-foreground truncate">{entry.name}</span>
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold text-foreground ml-1.5 tabular-nums">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-3 glass-card p-3 sm:p-4 lg:p-5 opacity-0 animate-fade-in" style={{ animationDelay: "0.3s" }}>
                <h3 className="font-heading font-bold text-foreground text-xs sm:text-sm mb-3 sm:mb-4">Faturamento Mensal ({currentYear})</h3>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={monthlyData} margin={{ left: 0, right: 5, top: 5, bottom: 5 }}>
                      <defs>
                        <linearGradient id="finBarGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(160 84% 45%)" stopOpacity={0.95} />
                          <stop offset="100%" stopColor="hsl(160 84% 35%)" stopOpacity={0.5} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: tickColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: tickColor, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} width={40} />
                      <Tooltip formatter={(value: number) => [formatCurrencyBR(value), "Faturamento"]} contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: "8px", color: tooltipColor, fontSize: "12px", fontWeight: 500, padding: "6px 10px" }} cursor={{ fill: "hsl(160 84% 45% / 0.08)" }} />
                      <Bar dataKey="revenue" fill="url(#finBarGrad)" radius={[6, 6, 0, 0]} maxBarSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">Sem dados mensais</div>
                )}
              </div>
            </div>

            {/* Gestao chart */}
            <div className="glass-card p-3 sm:p-4 lg:p-5 opacity-0 animate-fade-in" style={{ animationDelay: "0.4s" }}>
              <h3 className="font-heading font-bold text-foreground text-xs sm:text-sm mb-3 sm:mb-4">Serviços por Gestão</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={gestaoData} layout="vertical" margin={{ left: 5, right: 15, top: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="gestaoGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(262 83% 58%)" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="hsl(262 83% 62%)" stopOpacity={0.95} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                  <XAxis type="number" tick={{ fill: tickColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: tickColor, fontSize: 10 }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: "8px", color: tooltipColor, fontSize: "12px", fontWeight: 500, padding: "6px 10px" }} />
                  <Bar dataKey="value" fill="url(#gestaoGrad)" radius={[0, 6, 6, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Channel Breakdown */}
            <ChannelBreakdown clients={filtered} />

            {/* Search + Table */}
            <div className="glass-card p-3 sm:p-4 lg:p-5 opacity-0 animate-fade-in" style={{ animationDelay: "0.6s" }}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 sm:mb-4">
                <h3 className="font-heading font-bold text-foreground text-xs sm:text-sm">
                  Clientes ({filtered.length})
                </h3>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="h-8 px-3 rounded-lg bg-secondary border border-border hover:bg-muted transition-colors text-xs text-foreground flex items-center gap-1.5 whitespace-nowrap">
                        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                        Situação
                        {statusFilter.length > 0 && (
                          <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold tabular-nums">
                            {statusFilter.length}
                          </span>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="end">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                        <span className="text-xs font-semibold text-foreground">Filtrar por situação</span>
                        {statusFilter.length > 0 && (
                          <button
                            onClick={() => setStatusFilter([])}
                            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                          >
                            <X className="w-3 h-3" /> Limpar
                          </button>
                        )}
                      </div>
                      <ScrollArea className="h-72">
                        <div className="p-2 space-y-0.5">
                          {ALL_STATUSES.map(s => {
                            const checked = statusFilter.includes(s);
                            return (
                              <label
                                key={s}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(v) =>
                                    setStatusFilter(prev =>
                                      v ? [...prev, s] : prev.filter(x => x !== s)
                                    )
                                  }
                                />
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${SITUACAO_BADGE[s] || "bg-muted text-muted-foreground"}`}>
                                  {s}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Buscar empresa, cliente, CNPJ..."
                      className="w-full h-8 pl-8 pr-3 rounded-lg bg-secondary border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                </div>
              </div>


              <div className="overflow-x-auto -mx-3 sm:-mx-4 lg:-mx-5">
                <table className="w-full text-[10px] sm:text-xs">
                  <thead>
                    <tr className="border-b border-border/50">
                      {[
                        { key: "empresa" as SortKey, label: "Empresa" },
                        { key: "situacao" as SortKey, label: "Situação" },
                        { key: "valorFixo" as SortKey, label: "Valor Fixo" },
                        { key: "gestao" as SortKey, label: "Gestão" },
                        { key: "estado" as SortKey, label: "UF" },
                        { key: "qtdMeses" as SortKey, label: "Meses" },
                        { key: "valorAtrasado" as SortKey, label: "Atrasado" },
                      ].map(col => (
                        <th
                          key={col.key}
                          onClick={() => handleSort(col.key)}
                          className="px-2 sm:px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors whitespace-nowrap first:pl-3 sm:first:pl-4 lg:first:pl-5"
                        >
                          {col.label}
                          <SortIcon col={col.key} />
                        </th>
                      ))}
                      <th className="px-2 sm:px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Cliente</th>
                      <th className="px-2 sm:px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Closer</th>
                      <th className="px-2 sm:px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Contrato</th>
                      <th className="px-2 sm:px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Pagamento</th>
                      <th className="px-2 sm:px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap last:pr-3 sm:last:pr-4 lg:last:pr-5">Região</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 100).map((c, i) => (
                      <tr key={`${c.empresa}-${c.regiao}-${i}`} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                        <td className="px-2 sm:px-3 py-2 font-medium text-foreground whitespace-nowrap first:pl-3 sm:first:pl-4 lg:first:pl-5 max-w-[180px] truncate">{c.empresa}</td>
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap">
                          <span className={`px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-semibold ${SITUACAO_BADGE[c.situacao] || "bg-muted text-muted-foreground"}`}>
                            {c.situacao}
                          </span>
                        </td>
                        <td className="px-2 sm:px-3 py-2 text-foreground tabular-nums whitespace-nowrap">{formatCurrencyBR(c.valorFixo)}</td>
                        <td className="px-2 sm:px-3 py-2 text-muted-foreground whitespace-nowrap">{c.gestao}</td>
                        <td className="px-2 sm:px-3 py-2 text-muted-foreground whitespace-nowrap">{c.estado || "-"}</td>
                        <td className="px-2 sm:px-3 py-2 text-muted-foreground tabular-nums whitespace-nowrap">{c.qtdMeses}</td>
                        <td className="px-2 sm:px-3 py-2 tabular-nums whitespace-nowrap">
                          {isClienteEmAtraso(c) ? (
                            <span className="text-destructive font-semibold">{formatCurrencyBR(getValorAtrasoEfetivo(c))}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-2 sm:px-3 py-2 text-muted-foreground whitespace-nowrap max-w-[120px] truncate">{c.cliente || "-"}</td>
                        <td className="px-2 sm:px-3 py-2 text-muted-foreground whitespace-nowrap">{c.closer || "-"}</td>
                        <td className="px-2 sm:px-3 py-2 text-muted-foreground whitespace-nowrap">{c.contrato || "-"}</td>
                        <td className="px-2 sm:px-3 py-2 text-muted-foreground whitespace-nowrap">{c.formaPagamento || "-"}</td>
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap last:pr-3 sm:last:pr-4 lg:last:pr-5">
                          <span className={`px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-semibold ${c.regiao === "SP" ? "bg-info/10 text-info" : "bg-warning/10 text-warning"}`}>
                            {c.regiao === "SP" ? "São Paulo" : "Salvador"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length > 100 && (
                  <p className="text-center text-[10px] text-muted-foreground py-2">
                    Mostrando 100 de {filtered.length} resultados. Refine a busca para ver mais.
                  </p>
                )}
                {filtered.length === 0 && !isLoading && (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    Nenhum resultado encontrado.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </main>
        </div>
      </div>
    </div>
  );
};

export default Financeiro;
