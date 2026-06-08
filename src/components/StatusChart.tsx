import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

type StatusClient = {
  id?: string;
  empresa: string;
  situacao: string;
};

type Props = { clients: StatusClient[] };

const StatusChart = ({ clients }: Props) => {
  const statusCounts: Record<string, number> = {};
  clients.forEach(c => {
    const situacao = c.situacao.toUpperCase();
    if (!situacao) return;
    statusCounts[situacao] = (statusCounts[situacao] || 0) + 1;
  });

  const data = Object.entries(statusCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const COLORS: Record<string, string> = {
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

  const isDark = document.documentElement.classList.contains("dark");
  const tooltipBg = isDark ? "hsl(230 13% 14%)" : "hsl(0 0% 100%)";
  const tooltipBorder = isDark ? "hsl(230 10% 22%)" : "hsl(220 13% 87%)";
  const tooltipColor = isDark ? "hsl(0 0% 95%)" : "hsl(230 15% 12%)";
  const strokeColor = isDark ? "hsl(230 15% 8%)" : "hsl(0 0% 100%)";

  return (
    <div className="glass-card p-3 sm:p-4 lg:p-5 h-full opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
      <h3 className="font-heading font-bold text-foreground text-xs sm:text-sm mb-3 sm:mb-4">
        Distribuição por Status
      </h3>
      <div className="flex flex-col items-center gap-3 sm:gap-4">
        <ResponsiveContainer width={160} height={160}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={72}
              paddingAngle={2}
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={2}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={COLORS[entry.name] || "hsl(215 14% 38%)"} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: "8px",
                color: tooltipColor,
                fontSize: "12px",
                fontWeight: 500,
                padding: "6px 10px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="w-full grid grid-cols-2 gap-x-3 sm:gap-x-4 lg:gap-x-6 gap-y-1.5 sm:gap-y-2">
          {data.map((entry) => (
            <div key={entry.name} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div
                  className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[entry.name] || "hsl(215 14% 38%)" }}
                />
                <span className="text-[10px] sm:text-xs text-muted-foreground truncate">{entry.name}</span>
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-foreground ml-1.5 sm:ml-2 tabular-nums">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatusChart;
