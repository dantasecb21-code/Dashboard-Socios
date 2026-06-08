import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Estrategia } from "@/services/estrategiasService";

interface Props {
  estrategias: Estrategia[];
}

const STATUS_COLORS: Record<string, string> = {
  "Em andamento": "hsl(217, 91%, 60%)",
  "Aprovada": "hsl(160, 84%, 39%)",
  "Aguardando aprovação": "hsl(36, 100%, 57%)",
  "Concluída": "hsl(172, 66%, 50%)",
  "Cancelada": "hsl(0, 84%, 60%)",
  "Pendente": "hsl(220, 8%, 56%)",
};

const EstrategiasStatusChart = ({ estrategias }: Props) => {
  const counts = estrategias.reduce<Record<string, number>>((acc, e) => {
    const s = e.statusOperacional || "Outro";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const data = Object.entries(counts).map(([name, value]) => ({ name, value }));

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Status Operacional</h3>
        <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Status Operacional</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" paddingAngle={3} stroke="none">
            {data.map((entry) => (
              <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "hsl(230, 10%, 30%)"} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: "hsl(230, 13%, 12%)", border: "1px solid hsl(230, 10%, 20%)", borderRadius: "8px", fontSize: "12px" }}
            itemStyle={{ color: "hsl(0, 0%, 95%)" }}
          />
          <Legend
            wrapperStyle={{ fontSize: "10px" }}
            formatter={(value) => <span className="text-muted-foreground">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EstrategiasStatusChart;
