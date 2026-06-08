import { useMemo } from "react";
import { Estrategia } from "@/services/estrategiasService";
import { differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Zap, ClipboardCheck, Clock, Trophy, CalendarClock, Info, Store } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  estrategias: Estrategia[];
}

interface GestorScore {
  nome: string;
  total: number;
  concluidas: number;
  preenchimento: number; // 0-100%
  tempoMedio: number | null; // days (execution)
  tempoCriacao: number | null; // days (creation)
  taxaNoPrazo: number; // 0-100% or -1
  scoreQuantidade: number; // 0-30
  scoreVelocidade: number; // 0-30
  scorePreenchimento: number; // 0-20
  scoreNoPrazo: number; // 0-20
  scoreTotal: number; // 0-100
}

const medals = ["🥇", "🥈", "🥉"];

const GestorVelocityRanking = ({ estrategias }: Props) => {
  const scores = useMemo(() => {
    const map = new Map<string, Estrategia[]>();
    estrategias.forEach((e) => {
      const gestor = e.gestorOperacional?.trim() || "Sem gestor";
      if (!map.has(gestor)) map.set(gestor, []);
      map.get(gestor)!.push(e);
    });

    const raw: Omit<GestorScore, "scoreVelocidade" | "scoreQuantidade" | "scoreTotal">[] = [];

    map.forEach((list, nome) => {
      const comDatas = list.filter((e) => e.dataInicio && e.dataConclusao).length;
      const preenchimento = list.length > 0 ? (comDatas / list.length) * 100 : 0;

      const tempos = list
        .filter((e) => e.dataInicio && e.dataConclusao)
        .map((e) => differenceInDays(parseISO(e.dataConclusao!), parseISO(e.dataInicio!)))
        .filter((t) => t >= 0);
      const tempoMedio = tempos.length > 0 ? tempos.reduce((a, b) => a + b, 0) / tempos.length : null;

      const criacaoTempos = list
        .filter((e) => e.dataCriacaoLoja && e.dataCriacao)
        .map((e) => differenceInDays(parseISO(e.dataCriacao!), parseISO(e.dataCriacaoLoja!)))
        .filter((t) => t >= 0);
      const tempoCriacao = criacaoTempos.length > 0 ? criacaoTempos.reduce((a, b) => a + b, 0) / criacaoTempos.length : null;

      const concluidas = list.filter((e) => e.statusOperacional === "Concluída");
      const noPrazo = concluidas.filter((e) => e.statusPrazo === "No prazo").length;
      const taxaNoPrazo = concluidas.length > 0 ? (noPrazo / concluidas.length) * 100 : -1;

      const scorePreenchimento = Math.round((preenchimento / 100) * 20);
      const scoreNoPrazo = taxaNoPrazo >= 0 ? Math.round((taxaNoPrazo / 100) * 20) : 0;

      raw.push({
        nome,
        total: list.length,
        concluidas: concluidas.length,
        preenchimento: Math.round(preenchimento),
        tempoMedio: tempoMedio !== null ? Math.round(tempoMedio) : null,
        tempoCriacao: tempoCriacao !== null ? Math.round(tempoCriacao) : null,
        taxaNoPrazo: taxaNoPrazo >= 0 ? Math.round(taxaNoPrazo) : -1,
        scorePreenchimento,
        scoreNoPrazo,
      });
    });

    // Normalize velocity: lowest tempo = 30pts, highest = 0pts
    const tempos = raw.filter((g) => g.tempoMedio !== null).map((g) => g.tempoMedio!);
    const minTempo = tempos.length > 0 ? Math.min(...tempos) : 0;
    const maxTempo = tempos.length > 0 ? Math.max(...tempos) : 1;
    const rangeT = maxTempo - minTempo || 1;

    // Normalize quantity: most concluídas = 30pts, least = 0pts
    const qtds = raw.map((g) => g.concluidas);
    const maxQtd = Math.max(...qtds, 1);
    const minQtd = Math.min(...qtds);
    const rangeQ = maxQtd - minQtd || 1;

    const result: GestorScore[] = raw.map((g) => {
      const scoreVelocidade =
        g.tempoMedio !== null ? Math.round((1 - (g.tempoMedio - minTempo) / rangeT) * 30) : 0;
      const scoreQuantidade = Math.round(((g.concluidas - minQtd) / rangeQ) * 30);
      return {
        ...g,
        scoreVelocidade,
        scoreQuantidade,
        scoreTotal: scoreQuantidade + scoreVelocidade + g.scorePreenchimento + g.scoreNoPrazo,
      };
    });

    result.sort((a, b) => b.scoreTotal - a.scoreTotal);
    return result;
  }, [estrategias]);

  const progressColor = (pct: number) => {
    if (pct >= 70) return "bg-emerald-500";
    if (pct >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (scores.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        Nenhum gestor encontrado com os filtros aplicados.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ranking baseado em: Quantidade de Estratégias × Tempo de Execução</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-4 h-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              <p>O ranking avalia cada gestor com base em 4 critérios:</p>
              <ul className="list-disc pl-3 mt-1 space-y-0.5">
                <li><strong>Quantidade (30 pts)</strong>: Nº de estratégias concluídas — mais concluídas = mais pontos</li>
                <li><strong>Velocidade (30 pts)</strong>: Tempo médio de execução — quanto menor, melhor</li>
                <li><strong>Preenchimento (20 pts)</strong>: % de estratégias com datas preenchidas</li>
                <li><strong>No Prazo (20 pts)</strong>: % de concluídas dentro do prazo</li>
              </ul>
              <p className="mt-1">Gestores com mais estratégias concluídas e menor tempo de execução ficam no topo.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {scores.map((g, i) => {
        const isTop3 = i < 3;
        return (
          <div
            key={g.nome}
            className={cn(
              "rounded-lg border p-4 transition-all",
              isTop3
                ? "border-primary/40 bg-primary/5"
                : "border-border/40 bg-card/50"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{i < 3 ? medals[i] : `#${i + 1}`}</span>
                <span className="font-semibold text-foreground text-sm">{g.nome}</span>
                <span className="text-xs text-muted-foreground">({g.total} estratégias · {g.concluidas} concluídas)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Trophy className={cn("w-4 h-4", g.scoreTotal >= 70 ? "text-yellow-400" : "text-muted-foreground")} />
                <span className={cn("text-lg font-bold", g.scoreTotal >= 70 ? "text-emerald-400" : g.scoreTotal >= 40 ? "text-yellow-400" : "text-red-400")}>
                  {g.scoreTotal}
                </span>
                <span className="text-xs text-muted-foreground">/100</span>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {/* Quantidade */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Store className="w-3 h-3" /> Concluídas
                  </span>
                  <span className="font-medium text-foreground">{g.concluidas}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", progressColor((g.scoreQuantidade / 30) * 100))}
                    style={{ width: `${(g.scoreQuantidade / 30) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{g.scoreQuantidade}/30 pts</span>
              </div>

              {/* Velocidade */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Zap className="w-3 h-3" /> Velocidade
                  </span>
                  <span className="font-medium text-foreground">
                    {g.tempoMedio !== null ? `${g.tempoMedio}d` : "—"}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", progressColor((g.scoreVelocidade / 30) * 100))}
                    style={{ width: `${(g.scoreVelocidade / 30) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{g.scoreVelocidade}/30 pts</span>
              </div>

              {/* Preenchimento */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <ClipboardCheck className="w-3 h-3" /> Preenchimento
                  </span>
                  <span className="font-medium text-foreground">{g.preenchimento}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", progressColor(g.preenchimento))}
                    style={{ width: `${g.preenchimento}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{g.scorePreenchimento}/20 pts</span>
              </div>

              {/* No Prazo */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3 h-3" /> No Prazo
                  </span>
                  <span className="font-medium text-foreground">
                    {g.taxaNoPrazo >= 0 ? `${g.taxaNoPrazo}%` : "—"}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", progressColor(g.taxaNoPrazo >= 0 ? g.taxaNoPrazo : 0))}
                    style={{ width: `${g.taxaNoPrazo >= 0 ? g.taxaNoPrazo : 0}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{g.scoreNoPrazo}/20 pts</span>
              </div>

              {/* Tempo Criação */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <CalendarClock className="w-3 h-3" /> T. Criação
                  </span>
                  <span className="font-medium text-foreground">
                    {g.tempoCriacao !== null ? `${g.tempoCriacao}d` : "—"}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">Média de dias entre criação da loja e da estratégia</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GestorVelocityRanking;
