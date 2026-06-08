import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { ClientTableRow } from "@/components/ClientTable";
import { formatCurrencyBR } from "@/data/financeiro";

type Props = { clients: ClientTableRow[] };

const RevenueChart = ({ clients }: Props) => {
  const gestorMensalidade: Record<string, number> = {};
  const activeStatuses = new Set(["PAGO", "NOVO CLIENTE", "A PAGAR", "ATRASADO", "ATRASO DO MÊS", "SINAL", "ACORDO"]);

  clients.forEach(c => {
    const gestor = (c.gestor || "").trim();
    if (!gestor || gestor === "-") return;
    if (!activeStatuses.has(c.situacao.toUpperCase())) return;
    if (!c.valorFixo || c.valorFixo <= 0) return;
    gestorMensalidade[gestor] = (gestorMensalidade[gestor] || 0) + c.valorFixo;
  });

  const data = Object.entries(gestorMensalidade)
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const isDark = document.documentElement.classList.contains("dark");
  const tooltipBg = isDark ? "hsl(230 13% 14%)" : "hsl(0 0% 100%)";
  const tooltipBorder = isDark ? "hsl(230 10% 22%)" : "hsl(220 13% 87%)";
  const tooltipColor = isDark ? "hsl(0 0% 95%)" : "hsl(230 15% 12%)";
  const gridColor = isDark ? "hsl(230 10% 18%)" : "hsl(220 13% 90%)";
  const tickColor = isDark ? "hsl(0 0% 60%)" : "hsl(220 8% 46%)";
  const labelColor = isDark ? "hsl(0 0% 70%)" : "hsl(220 8% 36%)";

  return (
    <div className="glass-card p-3 sm:p-4 lg:p-5 h-full opacity-0 animate-fade-in" style={{ animationDelay: "0.3s" }}>
      <h3 className="font-heading font-bold text-foreground text-xs sm:text-sm mb-3 sm:mb-4">
        Mensalidade por Gestor
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ left: 0, right: 5, top: 5, bottom: 5 }}>
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(262 83% 62%)" stopOpacity={0.95} />
              <stop offset="100%" stopColor="hsl(262 83% 50%)" stopOpacity={0.5} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: labelColor, fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            dy={6}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={50}
          />
          <YAxis
            tick={{ fill: tickColor, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            width={40}
          />
          <Tooltip
            formatter={(value: number) => [formatCurrencyBR(value), "Mensalidade"]}
            contentStyle={{
              background: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
              borderRadius: "8px",
              color: tooltipColor,
              fontSize: "12px",
              fontWeight: 500,
              padding: "6px 10px",
            }}
            cursor={{ fill: "hsl(262 83% 58% / 0.08)" }}
          />
          <Bar dataKey="revenue" fill="url(#barGrad)" radius={[6, 6, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RevenueChart;
