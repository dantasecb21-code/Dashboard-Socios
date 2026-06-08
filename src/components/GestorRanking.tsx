import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Info } from "lucide-react";
import { Estrategia } from "@/services/estrategiasService";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const RankingInfo = () => (
  <TooltipProvider delayDuration={100}>
    <UITooltip>
      <TooltipTrigger asChild>
        <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
          <Info className="w-3.5 h-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-xs text-xs leading-relaxed">
        <p className="font-semibold mb-1.5">Como funciona o Ranking de Produtividade</p>
        <ul className="space-y-1 list-disc list-inside text-muted-foreground">
          <li>Agrupa as estratégias por <span className="text-foreground font-medium">Gestor Operacional</span>.</li>
          <li>Ordena pelo número de <span className="text-foreground font-medium">Concluídas</span> (do maior para o menor) — quem mais entregou aparece no topo.</li>
          <li><span className="text-foreground font-medium">Aprovada</span> conta como Concluída (no sistema, ambas significam entregue).</li>
          <li><span className="text-foreground font-medium">Atrasadas</span> usa o <span className="text-foreground font-medium">Status de Prazo</span>, independente do status operacional.</li>
          <li>Mostra os <span className="text-foreground font-medium">10 gestores mais produtivos</span>.</li>
          <li>Respeita os filtros ativos (plataforma, sub-aba, etc.).</li>
        </ul>
      </TooltipContent>
    </UITooltip>
  </TooltipProvider>
);

interface Props {
  estrategias: Estrategia[];
}

const GestorRanking = ({ estrategias }: Props) => {
  const gestorMap = new Map<string, { total: number; emAndamento: number; concluidas: number; atrasadas: number }>();

  for (const e of estrategias) {
    const g = (e.gestorOperacional?.trim()) || "Sem gestor";
    const curr = gestorMap.get(g) || { total: 0, emAndamento: 0, concluidas: 0, atrasadas: 0 };
    curr.total++;
    if (e.statusOperacional === "Em andamento") curr.emAndamento++;
    // Aprovada = Concluída no sistema (ambas contam como entregues)
    if (e.statusOperacional === "Concluída" || e.statusOperacional === "Aprovada") curr.concluidas++;
    if (e.statusPrazo === "Atrasada" || e.statusPrazo?.toLowerCase() === "atrasado") curr.atrasadas++;
    gestorMap.set(g, curr);
  }

  const data = Array.from(gestorMap.entries())
    .map(([gestor, v]) => ({ gestor, ...v }))
    .sort((a, b) => b.concluidas - a.concluidas)
    .slice(0, 10);

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ranking de Produtividade</h3>
          <RankingInfo />
        </div>
        <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ranking de Produtividade</h3>
        <RankingInfo />
      </div>
      <ResponsiveContainer width="100%" height={Math.max(280, data.length * 56)}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }} barCategoryGap="30%">
          <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(220, 8%, 56%)" }} />
          <YAxis
            type="category"
            dataKey="gestor"
            tick={{ fontSize: 11, fill: "hsl(220, 8%, 70%)" }}
            width={130}
            interval={0}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "hsl(230, 13%, 12%)", border: "1px solid hsl(230, 10%, 20%)", borderRadius: "8px", fontSize: "12px" }}
            itemStyle={{ color: "hsl(0, 0%, 95%)" }}
          />
          <Legend wrapperStyle={{ fontSize: "10px" }} />
          <Bar dataKey="concluidas" name="Concluídas" fill="hsl(160, 84%, 39%)" radius={[0, 0, 0, 0]} stackId="a" />
          <Bar dataKey="emAndamento" name="Em Andamento" fill="hsl(217, 91%, 60%)" radius={[0, 0, 0, 0]} stackId="a" />
          <Bar dataKey="atrasadas" name="Atrasadas" fill="hsl(0, 84%, 60%)" radius={[0, 4, 4, 0]} stackId="a" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GestorRanking;
