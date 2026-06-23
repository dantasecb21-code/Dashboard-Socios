import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, DollarSign, AlertTriangle, TrendingUp, Activity, Store, Sun, Moon, RefreshCw } from "lucide-react";
import logo from "@/assets/mibusca-logo.png";
import KpiCard from "@/components/KpiCard";
import StatusChart from "@/components/StatusChart";
import RevenueChart from "@/components/RevenueChart";
import ClientTable, { ClientTableRow } from "@/components/ClientTable";
import { useTheme } from "@/hooks/use-theme";
import { useClients } from "@/hooks/useClients";
import { useFinanceiro } from "@/hooks/useFinanceiro";
import { useGerenciamento } from "@/hooks/useGerenciamento";
import { useEstrategias } from "@/hooks/useEstrategias";
import { usePerformance } from "@/hooks/usePerformance";
import EstrategiasContent from "@/components/EstrategiasContent";
import PerformanceContent from "@/components/PerformanceContent";
import EstadosContent from "@/components/EstadosContent";
import ComercialSpContent from "@/components/ComercialSpContent";
import ComercialSalvadorContent from "@/components/ComercialSalvadorContent";
import RhFolhaContent from "@/components/RhFolhaContent";
import { formatCurrencyBR, isClienteEmAtraso } from "@/data/financeiro";
import { normalizeEmpresa } from "@/lib/utils";
import { formatCurrency } from "@/data/clients";
import AppSidebar, { SidebarGroup } from "@/components/AppSidebar";
import { BASE_SIDEBAR_GROUPS } from "@/config/sidebar";
import RightPanel from "@/components/RightPanel";

const OUTROS_SERVICES = ["GOOGLE", "TRÁFEGO PAGO", "KEETA", "SITE", "SEO", "MANUT. SITE", "GOOGLE + DISPARO", "GESTÃO RH E MKT"];

const Index = () => {
  const [activeTab, setActiveTab] = useState("GERAL");
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timeoutId: number;
    const scheduleNextMinute = () => {
      const current = new Date();
      const msUntilNextMinute = Math.max(1000, (60 - current.getSeconds()) * 1000 - current.getMilliseconds());
      timeoutId = window.setTimeout(() => {
        setNow(new Date());
        scheduleNextMinute();
      }, msUntilNextMinute);
    };
    scheduleNextMinute();
    return () => window.clearTimeout(timeoutId);
  }, []);
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { data: allClients = [], isLoading, isFetching: isFetchingClients, refetch: refetchClients } = useClients();
  const { data: finData, isFetching: isFetchingFinanceiro, refetch: refetchFinanceiro } = useFinanceiro();
  const { data: gerData, isFetching: isFetchingGerenciamento, refetch: refetchGerenciamento } = useGerenciamento();
  const { data: estData, isFetching: isFetchingEstrategias, refetch: refetchEstrategias } = useEstrategias();
  const { data: perfData, isFetching: isFetchingPerformance, refetch: refetchPerformance } = usePerformance();
  const finClients = finData?.clients ?? [];
  const gerLojas = gerData?.ativas ?? [];
  const estrategias = estData?.estrategias ?? [];
  const estrategiasSummary = estData?.summary;
  const performanceRows = perfData?.rows ?? [];
  const performanceIfoodRows = useMemo(
    () => performanceRows.filter((row) => row.plataforma === "iFood"),
    [performanceRows]
  );
  const performance99Rows = useMemo(
    () => performanceRows.filter((row) => row.plataforma === "99Food"),
    [performanceRows]
  );
  const performanceSummary = perfData?.summary;
  const isRefreshing = isFetchingClients || isFetchingFinanceiro || isFetchingGerenciamento || isFetchingEstrategias || isFetchingPerformance;

  const handleRefresh = () => {
    void Promise.all([refetchClients(), refetchFinanceiro(), refetchGerenciamento(), refetchEstrategias(), refetchPerformance()]);
  };


  // Build gestor lookup from Gerenciamento (fuzzy match by empresa)
  const gestorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const loja of gerLojas) {
      const key = normalizeEmpresa(loja.empresa);
      if (key && loja.gestor && !map.has(key)) {
        map.set(key, loja.gestor);
      }
    }
    return map;
  }, [gerLojas]);

  const findGestor = (empresa: string): string | undefined => {
    const key = normalizeEmpresa(empresa);
    return gestorMap.get(key);
  };

  // Normalize combos de gestão para filtrar por aba sem duplicar linhas no cálculo
  const expandGestao = (gestao: string): string[] => {
    const g = gestao.toUpperCase().trim();
    if (!g || g === "-") return [];
    
    const services: string[] = [];
    const isCompleta = g.includes("COMPLETA");
    if (isCompleta) {
      services.push("GOOGLE", "IFOOD");
    }
    if (!isCompleta && g.includes("IFOOD")) services.push("IFOOD");
    if (!isCompleta && g.includes("GOOGLE")) services.push("GOOGLE");
    if (g.includes("99FOOD") || g.includes("99+IFOOD") || g.includes("+99")) services.push("99FOOD");
    if (g.includes("KEETA")) services.push("KEETA");
    if (g.includes("TRÁFEGO") || g.includes("+TP") || g.includes("TP ")) services.push("TRÁFEGO PAGO");
    if (g.includes("SITE") && !g.includes("MANUT")) services.push("SITE");
    if (g.includes("SEO")) services.push("SEO");
    if (g.includes("MANUT")) services.push("MANUT. SITE");
    if (g.includes("DISPARO")) services.push("GOOGLE + DISPARO");
    if (g.includes("GESTÃO RH")) services.push("GESTÃO RH E MKT");
    
    if (services.length === 0) services.push(g);
    return services;
  };

  const matchesTab = (gestao: string, tab: string) => {
    if (tab === "GERAL") return true;
    const services = expandGestao(gestao);
    if (tab === "OUTROS") return services.some(s => OUTROS_SERVICES.includes(s));
    return services.includes(tab);
  };

  // Enrich with gestor from Gerenciamento
  const enrichedFinClients: ClientTableRow[] = useMemo(() => {
    return finClients.map(c => ({
      ...c,
      gestor: findGestor(c.empresa) || "",
    }));
  }, [finClients, gestorMap]);

  const filtered = activeTab === "GERAL"
    ? enrichedFinClients
    : enrichedFinClients.filter(c => matchesTab(c.gestao, activeTab));

  // Raw: cada linha conta como 1 serviço
  const uniqueFiltered = filtered;

  // Deduplicação por cliente (ID; fallback para empresa normalizada)
  const uniqueClientsByIdOrEmpresa = <T extends { id?: string; empresa: string }>(rows: T[]) => {
    const seen = new Set<string>();
    rows.forEach((r) => {
      const id = (r.id || "").trim();
      const key = id && id !== "-" ? id : normalizeEmpresa(r.empresa);
      if (key) seen.add(key);
    });
    return seen.size;
  };

  const activeStatuses = ["PAGO", "NOVO CLIENTE", "A PAGAR", "ATRASO DO MÊS", "ACORDO", "SINAL", "ATRASADO"];
  const revenueStatuses = ["PAGO", "NOVO CLIENTE", "A PAGAR", "ATRASADO", "ATRASO DO MÊS", "SINAL", "ACORDO"];

  // Active services from Financeiro (primary source) — contagem por linha (cada serviço conta)
  const activeFin = filtered.filter(c => activeStatuses.includes(c.situacao.toUpperCase()));
  const activeServiceCount = activeFin.length;
  const totalServiceCount = filtered.length;
  // Clientes: contagem de clientes ÚNICOS (mesmo cliente com 2 serviços = 1)
  const activeClientCount = uniqueClientsByIdOrEmpresa(activeFin);
  const totalClientCount = uniqueClientsByIdOrEmpresa(filtered);

  // Gerenciamento active count for comparison (maps sheet names to tab names)
  const gerAtivas = gerData?.ativas ?? [];
  const gerServiceTotals = gerData?.serviceTotals ?? {};
  const normalizeServico = (s: string): string => {
    const up = s.toUpperCase().trim();
    if (up === "W99FOOD" || up === "99 FOOD") return "99FOOD";
    if (up === "LISTAGOOGLE") return "GOOGLE";
    if (up === "LISTAIFOOD") return "IFOOD";
    return up;
  };
  const gerAtivasForTab = activeTab === "GERAL"
    ? gerAtivas
    : gerAtivas.filter(l => normalizeServico(l.servico) === activeTab);
  const countAtivasByServico = (svc: string) => gerAtivas.filter(l => l.servico === svc).length;
  const gerIfoodCount = gerServiceTotals["IFOOD"] ?? countAtivasByServico("IFOOD");
  const ger99Count = gerServiceTotals["99FOOD"] ?? countAtivasByServico("99FOOD");
  const gerAtivasCount = activeTab === "GERAL"
    ? gerIfoodCount + ger99Count
    : (gerServiceTotals[activeTab] ?? gerAtivasForTab.length);

  const overdue = filtered.filter(isClienteEmAtraso);

  // Receita mensal: usa o resumo da planilha (TOTAL DE CLIENTES ATIVOS) na aba GERAL
  // Nas abas de serviço, calcula a partir das linhas filtradas
  const summaries = finData?.summaries;
  const totalMensalidade = activeTab === "GERAL" && summaries
    ? summaries.geral.receitaMensal
    : filtered
        .filter(c => revenueStatuses.includes(c.situacao.toUpperCase()) && c.valorFixo > 0)
        .reduce((sum, c) => sum + c.valorFixo, 0);
  const emCancelamentoTotal = activeTab === "GERAL" && summaries
    ? summaries.geral.emCancelamento
    : filtered
        .filter(c => ["EM CANCELAMENTO", "EM CANCELAMENTO/ATRASADO", "EM CANCELAMENTO/PAGO"].includes(c.situacao.toUpperCase()) && c.valorFixo > 0)
        .reduce((sum, c) => sum + c.valorFixo, 0);

  // Build sidebar groups with dynamic badges
  const estadosCount = new Set(
    (gerData?.lojas ?? [])
      .map(l => (l.estado || "").trim().toUpperCase())
      .filter(Boolean)
  ).size;

  const sidebarGroups: SidebarGroup[] = useMemo(() => {
    const getBadge = (key: string): number | string | null => {
      if (key === "ESTRATÉGIAS") return estrategiasSummary?.total ?? estrategias.length;
      if (key === "PERFORMANCE") {
        return performanceIfoodRows.filter(r => {
          const s = (r.statusLoja || "").toLowerCase();
          return s === "ativa" || s === "em cancelamento";
        }).length;
      }
      if (key === "PERFORMANCE 99") {
        return performance99Rows.filter(r => {
          const s = (r.statusLoja || "").toLowerCase();
          return s === "ativa" || s === "em cancelamento";
        }).length;
      }
      if (key === "ESTADOS") return estadosCount;
      if (key === "COMERCIAL SP" || key === "COMERCIAL" || key === "RH FOLHA") return null;
      const tabFin = enrichedFinClients.filter(c => matchesTab(c.gestao, key));
      const finCount = tabFin.filter(c => activeStatuses.includes(c.situacao.toUpperCase())).length;
      const gerCount = key === "OUTROS"
        ? OUTROS_SERVICES.reduce((acc, s) => acc + (gerServiceTotals[s] ?? gerAtivas.filter(l => normalizeServico(l.servico) === s).length), 0)
        : (gerServiceTotals[key] ?? gerAtivas.filter(l => normalizeServico(l.servico) === key).length);
      return gerCount > 0 ? gerCount : finCount;
    };

    return BASE_SIDEBAR_GROUPS.map(group => ({
      ...group,
      tabs: group.tabs.map(tab => ({ ...tab, badge: getBadge(tab.key) })),
    }));
  }, [enrichedFinClients, estadosCount, estrategias, estrategiasSummary, performanceIfoodRows, performance99Rows, gerAtivas, gerServiceTotals]);

  return (
    <div className="min-h-screen bg-background bg-grid">
      <div className="fixed inset-0 bg-radial-glow pointer-events-none" />
      <div className="relative flex">
        <AppSidebar groups={sidebarGroups} activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 min-w-0 md:pl-[68px]">

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-primary/15 backdrop-blur-2xl bg-background/50">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.06] via-transparent to-accent/[0.06] pointer-events-none" />
          <div className="max-w-[1400px] mx-auto pl-16 pr-4 sm:pl-16 sm:pr-6 lg:px-8 relative">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-sm sm:text-base font-heading font-extrabold tracking-tight text-foreground">
                  Painel de <span className="gradient-text">Gestão</span>
                </h1>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground tracking-[0.2em] uppercase leading-none mt-1 font-semibold">
                  Clientes & Mensalidades · <span className="text-primary/80">{activeTab}</span>
                </p>
              </div>
              {(activeTab === "IFOOD" || activeTab === "99FOOD") && (
                <div className="hidden sm:flex items-center gap-2 ml-2 pl-3 border-l border-white/10 animate-fade-in">
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                    activeTab === "IFOOD"
                      ? "bg-destructive/15 text-destructive border-destructive/30"
                      : "bg-yellow-500/15 text-yellow-500 border-yellow-500/30"
                  }`}>
                    {activeTab}
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-heading font-extrabold text-foreground text-base tabular-nums leading-none">{gerAtivasCount}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-[0.18em] font-semibold">lojas ativas</span>
                  </div>
                </div>
              )}
              {(activeTab === "PERFORMANCE" || activeTab === "PERFORMANCE 99") && (() => {
                const rows = activeTab === "PERFORMANCE" ? performanceIfoodRows : performance99Rows;
                const ativas = rows.filter(r => (r.statusLoja || "").toLowerCase() === "ativa").length;
                const cancel = rows.filter(r => (r.statusLoja || "").toLowerCase() === "em cancelamento").length;
                const isIfood = activeTab === "PERFORMANCE";
                return (
                  <div className="hidden sm:flex items-center gap-2 ml-2 pl-3 border-l border-white/10 animate-fade-in">
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                      isIfood
                        ? "bg-destructive/15 text-destructive border-destructive/30"
                        : "bg-yellow-500/15 text-yellow-500 border-yellow-500/30"
                    }`}>
                      {isIfood ? "IFOOD" : "99FOOD"}
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-heading font-extrabold text-foreground text-base tabular-nums leading-none">{ativas + cancel}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-[0.18em] font-semibold">
                        lojas ativas{cancel > 0 ? ` · ${cancel} em canc.` : ""}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-card/50 border border-white/10 hover:border-primary/40 hover:bg-primary/10 backdrop-blur-md transition-all disabled:opacity-50"
                aria-label="Atualizar dados"
              >
                <RefreshCw className={`w-4 h-4 text-muted-foreground ${isRefreshing ? "animate-spin text-primary" : ""}`} />
              </button>
              <button
                onClick={toggle}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-card/50 border border-white/10 hover:border-primary/40 hover:bg-primary/10 backdrop-blur-md transition-all"
                aria-label="Alternar tema"
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4 text-warning" />
                ) : (
                  <Moon className="w-4 h-4 text-primary" />
                )}
              </button>
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 border border-success/25 backdrop-blur-md">
                 <div className={`w-1.5 h-1.5 rounded-full ${isRefreshing ? "bg-warning animate-pulse" : "bg-success animate-pulse shadow-[0_0_8px_hsl(var(--success))]"}`} />
                 <span className={`text-[10px] font-bold tracking-wider uppercase ${isRefreshing ? "text-warning" : "text-success"}`}>
                   {isRefreshing ? "Atualizando" : "Ao vivo"}
                </span>
              </div>
              <span className="hidden sm:inline text-xs text-muted-foreground font-medium tabular-nums">
                {now.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })} · {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className={`relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 ${isLoading ? "opacity-60" : ""}`}>
        {activeTab === "ESTRATÉGIAS" ? (
          <EstrategiasContent estrategias={estrategias} summary={estrategiasSummary} isLoading={isFetchingEstrategias} />
        ) : activeTab === "PERFORMANCE" ? (
          <PerformanceContent rows={performanceIfoodRows} summary={performanceSummary} isLoading={isFetchingPerformance} />
        ) : activeTab === "PERFORMANCE 99" ? (
          <PerformanceContent rows={performance99Rows} summary={performanceSummary} isLoading={isFetchingPerformance} />
        ) : activeTab === "ESTADOS" ? (
          <EstadosContent />
        ) : activeTab === "COMERCIAL SP" ? (
          <ComercialSpContent />
        ) : activeTab === "COMERCIAL" ? (
          <ComercialSalvadorContent />
        ) : activeTab === "RH FOLHA" ? (
          <RhFolhaContent />
        ) : (
          <div className="flex flex-col xl:flex-row gap-4 sm:gap-6">
            <div className="flex-1 min-w-0 space-y-4 sm:space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
              <KpiCard
                title="Clientes"
                value={activeClientCount}
                subtitle={`${totalClientCount} total`}
                icon={Users}
                variant="info"
                delay={0}
              />
              {(activeTab === "IFOOD" || activeTab === "99FOOD") ? (
                <KpiCard
                  title="Serviços Ativos"
                  value={gerAtivasCount}
                  subtitle={`Gerenciamento • Financeiro: ${activeServiceCount}`}
                  icon={Store}
                  delay={1}
                  tooltip={`Gerenciamento: ${gerAtivasCount} ativos / Financeiro: ${activeServiceCount} ativos`}
                />
              ) : (
                <KpiCard
                  title="Serviços Ativos"
                  value={activeServiceCount}
                  subtitle={activeTab === "GERAL" ? `Gerenciamento: ${gerIfoodCount + ger99Count}` : `${gerAtivasCount} no gerenciamento`}
                  icon={Store}
                  delay={1}
                  tooltip={activeTab === "GERAL"
                    ? `Valor principal (${activeServiceCount}) = Serviços ATIVOS na planilha Financeira (situação PAGO, A PAGAR, ATRASADO, etc — exclui INATIVO/CANCELADO).\n\nGerenciamento (${gerIfoodCount + ger99Count}) = iFood ${gerIfoodCount} + 99Food ${ger99Count}, contando cada canal operacional separadamente (uma loja com 2 canais conta 2x).\n\nA diferença é normal: fontes e critérios distintos.`
                    : undefined}
                />
              )}
              <div className="relative">
                <KpiCard
                  title="Receita Mensal"
                  value={formatCurrencyBR(totalMensalidade)}
                  subtitle="Planilha financeira"
                  icon={DollarSign}
                  variant="success"
                  delay={2}
                />
                {emCancelamentoTotal > 0 && (
                  <span className="absolute bottom-1.5 right-1.5 text-[8px] sm:text-[9px] font-bold text-destructive">
                    Em canc: {formatCurrencyBR(emCancelamentoTotal)}
                  </span>
                )}
              </div>
              <KpiCard
                title="Total Serviços"
                value={totalServiceCount}
                subtitle={`${activeServiceCount} ativos`}
                icon={TrendingUp}
                delay={3}
              />
              <KpiCard
                title="Inadimplentes"
                value={overdue.length}
                subtitle="Atraso ou atrasado"
                icon={AlertTriangle}
                variant="warning"
                delay={4}
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4">
              <div className="lg:col-span-2">
                <StatusChart clients={filtered} />
              </div>
              <div className="lg:col-span-3">
                <RevenueChart clients={filtered} />
              </div>
            </div>

            {/* Table */}
            <ClientTable clients={filtered} />
            </div>

            {activeTab === "GERAL" && (
              <RightPanel clients={filtered} revenueClients={allClients} receitaMensal={totalMensalidade} />
            )}
          </div>
        )}
      </main>
        </div>
      </div>
    </div>
  );
};

export default Index;
