import { useMemo } from "react";
import { Target, Clock, AlertTriangle, CheckCircle, Timer, Layers, CalendarClock, Hourglass } from "lucide-react";
import KpiCard from "./KpiCard";
import { Estrategia, EstrategiasSummary } from "@/services/estrategiasService";
import { differenceInDays, parseISO } from "date-fns";

interface Props {
  estrategias: Estrategia[];
  summary?: EstrategiasSummary;
}

const EstrategiasKpis = ({ estrategias, summary }: Props) => {
  const total = summary?.total ?? estrategias.length;
  const emAndamento = summary?.emAndamento ?? estrategias.filter(e => e.statusOperacional === "Em andamento").length;
  const aguardando = summary?.aguardando ?? estrategias.filter(e => e.statusOperacional === "Aguardando aprovação").length;
  const atrasadas = summary?.atrasadas ?? estrategias.filter(e => e.statusPrazo === "Atrasada").length;
  const aprovadas = summary?.aprovadas ?? estrategias.filter(e => e.statusOperacional === "Aprovada").length;
  const concluidas = summary?.concluidas ?? estrategias.filter(e => e.statusOperacional === "Concluída").length;

  const { tempoCriacao, tempoExecucao } = useMemo(() => {
    const criacaoDias: number[] = [];
    const execucaoDias: number[] = [];
    for (const e of estrategias) {
      if (e.dataCriacaoLoja && e.dataCriacao) {
        const d = differenceInDays(parseISO(e.dataCriacao), parseISO(e.dataCriacaoLoja));
        if (d >= 0) criacaoDias.push(d);
      }
      if (e.dataInicio && e.dataConclusao) {
        const d = differenceInDays(parseISO(e.dataConclusao), parseISO(e.dataInicio));
        if (d >= 0) execucaoDias.push(d);
      }
    }
    return {
      tempoCriacao: criacaoDias.length > 0 ? Math.round(criacaoDias.reduce((a, b) => a + b, 0) / criacaoDias.length) : null,
      tempoExecucao: execucaoDias.length > 0 ? Math.round(execucaoDias.reduce((a, b) => a + b, 0) / execucaoDias.length) : null,
    };
  }, [estrategias]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3">
      <KpiCard title="Total" value={total} icon={Layers} delay={0} />
      <KpiCard title="Em Andamento" value={emAndamento} icon={Target} variant="info" delay={1} />
      <KpiCard title="Aguardando" value={aguardando} icon={Clock} delay={2} />
      <KpiCard title="Atrasadas" value={atrasadas} icon={AlertTriangle} variant="warning" delay={3} />
      <KpiCard title="Aprovadas" value={aprovadas} icon={Timer} variant="success" delay={4} />
      <KpiCard title="Concluídas" value={concluidas} icon={CheckCircle} variant="success" delay={5} />
      <KpiCard title="T.M. Criação" value={tempoCriacao !== null ? `${tempoCriacao}d` : "—"} icon={CalendarClock} delay={6} />
      <KpiCard title="T.M. Execução" value={tempoExecucao !== null ? `${tempoExecucao}d` : "—"} icon={Hourglass} delay={7} />
    </div>
  );
};

export default EstrategiasKpis;
