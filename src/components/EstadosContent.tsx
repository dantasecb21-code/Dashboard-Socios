import { useMemo, useState } from "react";
import { MapPin, TrendingUp, TrendingDown, Store, DollarSign, FileSpreadsheet, Tag, Info, Search } from "lucide-react";
import KpiCard from "@/components/KpiCard";
import { useEstadosAnalise, type PlataformaFilter, type AggregatedRow } from "@/hooks/useEstadosAnalise";
import { formatCurrencyBR } from "@/data/financeiro";
import EstadosExcelExportModal from "@/components/EstadosExcelExportModal";
import EstadoLojasModal from "@/components/EstadoLojasModal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type RankingMode = "variacao" | "volume";

const fmtPct = (v: number | null) => {
  if (v === null || !Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
};

const pctClass = (v: number | null) => {
  if (v === null) return "text-muted-foreground";
  if (v > 0.5) return "text-success";
  if (v < -0.5) return "text-destructive";
  return "text-warning";
};

const PLATAFORMA_OPTS: { value: PlataformaFilter; label: string }[] = [
  { value: "AMBOS", label: "Ambos" },
  { value: "iFood", label: "iFood" },
  { value: "99Food", label: "99Food" },
];

const UFS_BR: { uf: string; nome: string; regiao: string }[] = [
  { uf: "AC", nome: "Acre", regiao: "Norte" },
  { uf: "AL", nome: "Alagoas", regiao: "Nordeste" },
  { uf: "AP", nome: "Amapá", regiao: "Norte" },
  { uf: "AM", nome: "Amazonas", regiao: "Norte" },
  { uf: "BA", nome: "Bahia", regiao: "Nordeste" },
  { uf: "CE", nome: "Ceará", regiao: "Nordeste" },
  { uf: "DF", nome: "Distrito Federal", regiao: "Centro-Oeste" },
  { uf: "ES", nome: "Espírito Santo", regiao: "Sudeste" },
  { uf: "GO", nome: "Goiás", regiao: "Centro-Oeste" },
  { uf: "MA", nome: "Maranhão", regiao: "Nordeste" },
  { uf: "MT", nome: "Mato Grosso", regiao: "Centro-Oeste" },
  { uf: "MS", nome: "Mato Grosso do Sul", regiao: "Centro-Oeste" },
  { uf: "MG", nome: "Minas Gerais", regiao: "Sudeste" },
  { uf: "PA", nome: "Pará", regiao: "Norte" },
  { uf: "PB", nome: "Paraíba", regiao: "Nordeste" },
  { uf: "PR", nome: "Paraná", regiao: "Sul" },
  { uf: "PE", nome: "Pernambuco", regiao: "Nordeste" },
  { uf: "PI", nome: "Piauí", regiao: "Nordeste" },
  { uf: "RJ", nome: "Rio de Janeiro", regiao: "Sudeste" },
  { uf: "RN", nome: "Rio Grande do Norte", regiao: "Nordeste" },
  { uf: "RS", nome: "Rio Grande do Sul", regiao: "Sul" },
  { uf: "RO", nome: "Rondônia", regiao: "Norte" },
  { uf: "RR", nome: "Roraima", regiao: "Norte" },
  { uf: "SC", nome: "Santa Catarina", regiao: "Sul" },
  { uf: "SP", nome: "São Paulo", regiao: "Sudeste" },
  { uf: "SE", nome: "Sergipe", regiao: "Nordeste" },
  { uf: "TO", nome: "Tocantins", regiao: "Norte" },
];

const EstadosContent = () => {
  const [plataforma, setPlataforma] = useState<PlataformaFilter>("AMBOS");
  const [excelOpen, setExcelOpen] = useState(false);
  const [rankingMode, setRankingMode] = useState<RankingMode>("variacao");
  const [estadoSelecionado, setEstadoSelecionado] = useState<string | null>(null);
  const [estadoSearch, setEstadoSearch] = useState("");
  const [nichoSearch, setNichoSearch] = useState("");
  const analise = useEstadosAnalise(plataforma);

  // Variação geral = MÉDIA simples das variações % de cada loja
  // Para cada loja: (Fat. Mês Fechado − Fat. Inicial) / Fat. Inicial
  // No hook: r.fatAtual = Fat. Inicial (col O); r.fatAnterior = Fat. Mês Fechado (col P)
  const variacaoGeralStatus = useMemo(() => {
    let soma = 0, n = 0;
    for (const r of analise.rows) {
      const inicial = r.fatAtual;
      const fechado = r.fatAnterior;
      if (!inicial || inicial <= 0) continue;
      soma += ((fechado - inicial) / inicial) * 100;
      n += 1;
    }
    return n > 0 ? soma / n : null;
  }, [analise.rows]);

  const lojasDoEstado = useMemo(() => {
    if (!estadoSelecionado) return [];
    return analise.rows.filter((r) => r.estado === estadoSelecionado);
  }, [estadoSelecionado, analise.rows]);

  // Estados onde ainda NÃO há lojas mapeadas
  const estadosSemCobertura = useMemo(() => {
    const cobertos = new Set<string>();
    for (const e of analise.porEstado) {
      const raw = (e.estado || "").trim();
      if (!raw || raw === "Não informado") continue;
      // Normaliza: aceita "SP" ou "São Paulo"
      const m = UFS_BR.find(
        (u) => u.uf === raw.toUpperCase() || u.nome.toLowerCase() === raw.toLowerCase()
      );
      if (m) cobertos.add(m.uf);
    }
    const missing = UFS_BR.filter((u) => !cobertos.has(u.uf));
    const porRegiao: Record<string, typeof UFS_BR> = {};
    for (const u of missing) {
      (porRegiao[u.regiao] ||= []).push(u);
    }
    return { missing, porRegiao, cobertosCount: cobertos.size };
  }, [analise.porEstado]);

  const filteredEstados = useMemo(() => {
    const q = estadoSearch.trim().toLowerCase();
    if (!q) return analise.porEstado;
    return analise.porEstado.filter((e) => (e.estado || "").toLowerCase().includes(q));
  }, [analise.porEstado, estadoSearch]);

  const filteredNichos = useMemo(() => {
    const q = nichoSearch.trim().toLowerCase();
    if (!q) return analise.porNicho;
    return analise.porNicho.filter((n) => (n.nicho || "").toLowerCase().includes(q));
  }, [analise.porNicho, nichoSearch]);

  // Recalcula top 5 conforme o modo selecionado
  const { topAlta, topQueda } = useMemo(() => {
    if (rankingMode === "variacao") {
      return { topAlta: analise.topAlta, topQueda: analise.topQueda };
    }
    // Modo "volume": ranqueia pelo número de lojas no estado
    const candidatos: AggregatedRow[] = analise.porEstado.filter(
      (s) => s.estado && s.estado !== "Não informado"
    );
    const ordenadosDesc = [...candidatos].sort((a, b) => b.lojas - a.lojas).slice(0, 5);
    const ordenadosAsc = [...candidatos].sort((a, b) => a.lojas - b.lojas).slice(0, 5);
    return { topAlta: ordenadosDesc, topQueda: ordenadosAsc };
  }, [rankingMode, analise.topAlta, analise.topQueda, analise.porEstado]);


  if (!analise.hasMapping) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
        <MapPin className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <h3 className="text-base font-bold text-foreground mb-2">Mapeamento ainda não disponível</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Para usar a análise por <b>Estados</b> e <b>Nichos</b>, adicione as colunas{" "}
          <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">ESTADO</code> (ou{" "}
          <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">UF</code>) e{" "}
          <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">NICHO</code> (ou{" "}
          <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">SEGMENTO</code>) nas abas
          IFOOD / 99FOOD / GOOGLE da planilha de Gerenciamento. As lojas serão cruzadas
          automaticamente pelo nome.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 sm:space-y-6">
        {/* Filtros + Excel */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Plataforma:</span>
            <div className="inline-flex rounded-lg border border-border bg-secondary p-0.5">
              {PLATAFORMA_OPTS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setPlataforma(o.value)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    plataforma === o.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => setExcelOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-success/15 text-success border border-success/30 hover:bg-success/25 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Exportar Excel
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
          <KpiCard title="Estados" value={analise.estadosCount} subtitle={`${analise.nichosCount} nichos`} icon={MapPin} variant="info" delay={0} />
          <KpiCard title="Lojas" value={analise.totalLojas} subtitle={`${analise.lojasMapeadas} mapeadas`} icon={Store} delay={1} />
          <KpiCard title="Faturamento Inicial" value={formatCurrencyBR(analise.faturamentoAtual)} subtitle="Fat. inicial das lojas" icon={DollarSign} variant="success" delay={2} />
          <KpiCard title="Mês Anterior" value={formatCurrencyBR(analise.faturamentoAnterior)} subtitle="Último mês fechado" icon={DollarSign} delay={3} />
          <KpiCard
            title="Variação Geral"
            value={fmtPct(variacaoGeralStatus)}
            subtitle={variacaoGeralStatus !== null && variacaoGeralStatus >= 0 ? "Em alta" : "Em queda"}
            icon={variacaoGeralStatus !== null && variacaoGeralStatus >= 0 ? TrendingUp : TrendingDown}
            variant={variacaoGeralStatus !== null && variacaoGeralStatus >= 0 ? "success" : "warning"}
            delay={4}
            tooltip="Média simples das variações % de cada loja. Para cada loja: (Fat. Mês Fechado − Fat. Inicial) / Fat. Inicial. Usa as colunas O (Fat. Inicial) e P (Fat. Mês Fechado) da planilha de Performance. Considera apenas lojas Ativas e Em cancelamento."
          />

        </div>

        {/* Top Alta / Queda */}
        <TooltipProvider delayDuration={150}>
          <div className="space-y-3">
            {/* Switch global de modo de ranking */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                  Ranking por:
                </span>
                <div className="inline-flex rounded-lg border border-border bg-secondary p-0.5">
                  <button
                    onClick={() => setRankingMode("variacao")}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                      rankingMode === "variacao"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Variação %
                  </button>
                  <button
                    onClick={() => setRankingMode("volume")}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                      rankingMode === "volume"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Volume de lojas
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              {/* Top em Alta */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <h3 className="text-sm font-bold text-foreground">
                    {rankingMode === "variacao" ? "Top 5 Estados em Alta" : "Top 5 Estados com Mais Lojas"}
                  </h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Como o ranking é calculado">
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      {rankingMode === "variacao" ? (
                        <>
                          <p className="font-semibold mb-1">Critério: maior variação % positiva</p>
                          <p className="text-muted-foreground">
                            Baseado na coluna <b>STATUS (%)</b> da planilha (compara <b>Faturamento Inicial</b> com o <b>último mês fechado</b>),
                            usando média ponderada pelo faturamento atual de cada loja.
                            Apenas estados com no mínimo <b>2 lojas</b> entram no ranking.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold mb-1">Critério: maior número de lojas ativas</p>
                          <p className="text-muted-foreground">
                            Conta o total de lojas <b>Ativas</b> ou <b>Em cancelamento</b> mapeadas em cada estado,
                            considerando o filtro de plataforma selecionado.
                          </p>
                        </>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </div>
                {topAlta.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {rankingMode === "variacao"
                      ? "Sem dados suficientes (mínimo 2 lojas por estado)."
                      : "Sem estados mapeados."}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {topAlta.map((e, i) => (
                      <li key={e.key}>
                        <button
                          type="button"
                          onClick={() => e.estado && setEstadoSelecionado(e.estado)}
                          className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                            <span className="text-sm font-bold text-foreground">{e.estado}</span>
                            <span className="text-[10px] text-muted-foreground">({e.lojas} lojas)</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-muted-foreground">{formatCurrencyBR(e.faturamentoAtual)}</span>
                            {rankingMode === "variacao" ? (
                              <span className={`text-xs font-bold ${pctClass(e.variacaoPctStatus)}`}>{fmtPct(e.variacaoPctStatus)}</span>
                            ) : (
                              <span className="text-xs font-bold text-foreground">{e.lojas}</span>
                            )}
                          </div>
                        </button>
                      </li>

                    ))}
                  </ul>
                )}
              </div>

              {/* Top em Queda / Menos lojas */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown className="w-4 h-4 text-destructive" />
                  <h3 className="text-sm font-bold text-foreground">
                    {rankingMode === "variacao" ? "Top 5 Estados em Queda" : "Top 5 Estados com Menos Lojas"}
                  </h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Como o ranking é calculado">
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      {rankingMode === "variacao" ? (
                        <>
                          <p className="font-semibold mb-1">Critério: maior variação % negativa</p>
                          <p className="text-muted-foreground">
                            Baseado na coluna <b>STATUS (%)</b> da planilha (compara <b>Faturamento Inicial</b> com o <b>último mês fechado</b>),
                            usando média ponderada pelo faturamento atual de cada loja.
                            Apenas estados com no mínimo <b>2 lojas</b> entram no ranking.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold mb-1">Critério: menor número de lojas ativas</p>
                          <p className="text-muted-foreground">
                            Estados com menor concentração de lojas mapeadas (Ativas ou Em cancelamento),
                            considerando o filtro de plataforma selecionado.
                          </p>
                        </>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </div>
                {topQueda.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {rankingMode === "variacao"
                      ? "Sem dados suficientes (mínimo 2 lojas por estado)."
                      : "Sem estados mapeados."}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {topQueda.map((e, i) => (
                      <li key={e.key}>
                        <button
                          type="button"
                          onClick={() => e.estado && setEstadoSelecionado(e.estado)}
                          className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                            <span className="text-sm font-bold text-foreground">{e.estado}</span>
                            <span className="text-[10px] text-muted-foreground">({e.lojas} lojas)</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-muted-foreground">{formatCurrencyBR(e.faturamentoAtual)}</span>
                            {rankingMode === "variacao" ? (
                              <span className={`text-xs font-bold ${pctClass(e.variacaoPctStatus)}`}>{fmtPct(e.variacaoPctStatus)}</span>
                            ) : (
                              <span className="text-xs font-bold text-foreground">{e.lojas}</span>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </TooltipProvider>

        {/* Estados sem cobertura */}
        <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4">
          <div className="flex items-start gap-2 mb-3">
            <MapPin className="w-4 h-4 text-warning mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-foreground">
                Estados sem cobertura{" "}
                <span className="text-warning">({estadosSemCobertura.missing.length})</span>
              </h3>
              <p className="text-[11px] text-muted-foreground">
                UFs onde ainda não prestamos serviço. Cobertos atualmente:{" "}
                <b className="text-foreground">{estadosSemCobertura.cobertosCount}</b> de 27.
              </p>
            </div>
          </div>
          {estadosSemCobertura.missing.length === 0 ? (
            <p className="text-xs text-success font-semibold">
              ✓ Já atendemos todos os 27 estados brasileiros.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {Object.entries(estadosSemCobertura.porRegiao)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([regiao, ufs]) => (
                  <div key={regiao} className="rounded-lg bg-card border border-border p-3">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">
                      {regiao}{" "}
                      <span className="text-warning normal-case">({ufs.length})</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {ufs.map((u) => (
                        <span
                          key={u.uf}
                          title={u.nome}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-warning/10 text-warning border border-warning/30 text-[11px] font-bold"
                        >
                          {u.uf}
                          <span className="text-muted-foreground font-normal hidden xl:inline">
                            {u.nome}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Tabela por Estado */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Faturamento por Estado</h3>
            <div className="relative ml-auto flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={estadoSearch}
                  onChange={(ev) => setEstadoSearch(ev.target.value)}
                  placeholder="Buscar estado..."
                  className="pl-7 pr-2 py-1 text-xs rounded-md bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-40"
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{filteredEstados.length} de {analise.porEstado.length}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2 font-semibold">Estado</th>
                  <th className="px-4 py-2 font-semibold text-right">Lojas</th>
                  <th className="px-4 py-2 font-semibold text-right">Fat. Inicial</th>
                  <th className="px-4 py-2 font-semibold text-right">Mês Anterior</th>
                  <th className="px-4 py-2 font-semibold text-right">Variação</th>
                </tr>
              </thead>
              <tbody>
                {filteredEstados.map((e) => (
                  <tr
                    key={e.key}
                    onClick={() => e.estado && e.estado !== "Não informado" && setEstadoSelecionado(e.estado)}
                    className={`border-t border-border/50 hover:bg-secondary/30 ${
                      e.estado && e.estado !== "Não informado" ? "cursor-pointer" : ""
                    }`}
                  >
                    <td className="px-4 py-2 font-semibold text-foreground">{e.estado}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{e.lojas}</td>
                    <td className="px-4 py-2 text-right text-foreground">{formatCurrencyBR(e.faturamentoAtual)}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{formatCurrencyBR(e.faturamentoAnterior)}</td>
                    <td className={`px-4 py-2 text-right font-bold ${pctClass(e.variacaoPctStatus)}`}>{fmtPct(e.variacaoPctStatus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabela por Nicho */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Faturamento por Nicho</h3>
            <div className="relative ml-auto flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={nichoSearch}
                  onChange={(ev) => setNichoSearch(ev.target.value)}
                  placeholder="Buscar nicho..."
                  className="pl-7 pr-2 py-1 text-xs rounded-md bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-40"
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{filteredNichos.length} de {analise.porNicho.length}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2 font-semibold">Nicho</th>
                  <th className="px-4 py-2 font-semibold text-right">Lojas</th>
                  <th className="px-4 py-2 font-semibold text-right">Fat. Inicial</th>
                  <th className="px-4 py-2 font-semibold text-right">Mês Anterior</th>
                  <th className="px-4 py-2 font-semibold text-right">Variação</th>
                </tr>
              </thead>
              <tbody>
                {filteredNichos.map((n) => (
                  <tr key={n.key} className="border-t border-border/50 hover:bg-secondary/30">
                    <td className="px-4 py-2 font-semibold text-foreground">{n.nicho}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{n.lojas}</td>
                    <td className="px-4 py-2 text-right text-foreground">{formatCurrencyBR(n.faturamentoAtual)}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{formatCurrencyBR(n.faturamentoAnterior)}</td>
                    <td className={`px-4 py-2 text-right font-bold ${pctClass(n.variacaoPctStatus)}`}>{fmtPct(n.variacaoPctStatus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <EstadosExcelExportModal open={excelOpen} onClose={() => setExcelOpen(false)} analise={analise} />
      <EstadoLojasModal
        open={!!estadoSelecionado}
        onClose={() => setEstadoSelecionado(null)}
        estado={estadoSelecionado}
        lojas={lojasDoEstado}
      />
    </>
  );
};

export default EstadosContent;
