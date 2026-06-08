import { useState, useMemo } from "react";
import { Megaphone, Leaf, DollarSign, Users, AlertTriangle, TrendingUp, CheckCircle } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { FinanceiroClient, formatCurrencyBR } from "@/data/financeiro";
import KpiCard from "@/components/KpiCard";

type Channel = "TODOS" | "TRÁFEGO PAGO" | "ORGÂNICO";

function isTP(val: string | undefined | null): boolean {
  return (val || "").toUpperCase().includes("TRÁFEGO PAGO");
}

function classifyChannel(c: FinanceiroClient): "TRÁFEGO PAGO" | "ORGÂNICO" {
  return isTP(c.canal) || isTP(c.closer) || isTP(c.agender) ? "TRÁFEGO PAGO" : "ORGÂNICO";
}

const CHANNEL_COLORS = {
  "TRÁFEGO PAGO": "hsl(262 83% 58%)",
  "ORGÂNICO": "hsl(160 84% 39%)",
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

interface Props {
  clients: FinanceiroClient[];
}

export default function ChannelBreakdown({ clients }: Props) {
  const [channel, setChannel] = useState<Channel>("TODOS");

  const enriched = useMemo(() =>
    clients.map(c => ({ ...c, canal: classifyChannel(c) })),
    [clients]
  );

  const filtered = channel === "TODOS"
    ? enriched
    : enriched.filter(c => c.canal === channel);

  const pago = enriched.filter(c => c.canal === "TRÁFEGO PAGO");
  const organico = enriched.filter(c => c.canal === "ORGÂNICO");

  const activeStatuses = ["PAGO", "NOVO CLIENTE", "A PAGAR", "ATRASO DO MÊS", "ACORDO", "SINAL", "ATRASADO"];

  const pagoAtivos = pago.filter(c => activeStatuses.includes(c.situacao));
  const orgAtivos = organico.filter(c => activeStatuses.includes(c.situacao));

  const pagoReceita = pagoAtivos.reduce((s, c) => s + c.valorFixo, 0);
  const orgReceita = orgAtivos.reduce((s, c) => s + c.valorFixo, 0);

  const filteredAtivos = filtered.filter(c => activeStatuses.includes(c.situacao));
  const filteredReceita = filteredAtivos.reduce((s, c) => s + c.valorFixo, 0);
  const filteredOverdue = filtered.filter(c => ["ATRASO DO MÊS", "ATRASADO"].includes(c.situacao));

  // Receita Ativa = apenas PAGO + NOVO CLIENTE
  const paidStatuses = ["PAGO", "NOVO CLIENTE"];
  const filteredPagos = filtered.filter(c => paidStatuses.includes(c.situacao));
  const filteredReceitaAtiva = filteredPagos.reduce((s, c) => s + c.valorFixo, 0);
  const pagoPagos = pago.filter(c => paidStatuses.includes(c.situacao));
  const orgPagos = organico.filter(c => paidStatuses.includes(c.situacao));
  const pagoReceitaAtiva = pagoPagos.reduce((s, c) => s + c.valorFixo, 0);
  const orgReceitaAtiva = orgPagos.reduce((s, c) => s + c.valorFixo, 0);

  // Pie data
  const pieData = [
    { name: "Tráfego Pago", value: pagoAtivos.length },
    { name: "Orgânico", value: orgAtivos.length },
  ];

  // Revenue comparison
  const revenueData = [
    { name: "Tráfego Pago", receita: pagoReceita, clientes: pagoAtivos.length },
    { name: "Orgânico", receita: orgReceita, clientes: orgAtivos.length },
  ];

  const isDark = document.documentElement.classList.contains("dark");
  const tooltipBg = isDark ? "hsl(230 13% 14%)" : "hsl(0 0% 100%)";
  const tooltipBorder = isDark ? "hsl(230 10% 22%)" : "hsl(220 13% 87%)";
  const tooltipColor = isDark ? "hsl(0 0% 95%)" : "hsl(230 15% 12%)";
  const gridColor = isDark ? "hsl(230 10% 18%)" : "hsl(220 13% 90%)";
  const tickColor = isDark ? "hsl(0 0% 60%)" : "hsl(220 8% 46%)";
  const strokeColor = isDark ? "hsl(230 15% 8%)" : "hsl(0 0% 100%)";

  const tabs: Channel[] = ["TODOS", "TRÁFEGO PAGO", "ORGÂNICO"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold text-foreground text-sm sm:text-base flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Detalhamento por Canal de Venda
        </h3>
        <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5 border border-border">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setChannel(t)}
              className={`px-2.5 py-1 text-[10px] sm:text-[11px] font-bold uppercase rounded-md transition-all ${
                channel === t
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-3">
        <KpiCard
          title="Serviços Ativos"
          value={filteredAtivos.length}
          subtitle={`${filtered.length} total`}
          icon={Users}
          variant="info"
          delay={0}
          tooltip="Todos os serviços com status ativo (Pago, Novo Cliente, A Pagar, Atraso, Acordo, Sinal, Atrasado)"
        />
        <KpiCard
          title="Receita Canal"
          value={formatCurrencyBR(filteredReceita)}
          subtitle={channel === "TODOS" ? "Ambos canais" : channel}
          icon={DollarSign}
          variant="success"
          delay={1}
          tooltip="Soma do valor fixo de todos os serviços ativos (inclui a pagar, atrasados, acordos, etc.)"
        />
        <KpiCard
          title="Receita Ativa"
          value={formatCurrencyBR(filteredReceitaAtiva)}
          subtitle={`${filteredPagos.length} pagos`}
          icon={CheckCircle}
          variant="default"
          delay={2}
          tooltip="Soma do valor fixo apenas dos serviços com status PAGO ou NOVO CLIENTE"
        />
        <KpiCard
          title="Tráfego Pago"
          value={formatCurrencyBR(pagoReceita)}
          subtitle={`${pagoAtivos.length} ativos · ${pago.length} total`}
          icon={Megaphone}
          delay={3}
          tooltip={`Receita ativa: ${formatCurrencyBR(pagoReceitaAtiva)} (${pagoPagos.length} pagos)`}
        />
        <KpiCard
          title="Orgânico"
          value={formatCurrencyBR(orgReceita)}
          subtitle={`${orgAtivos.length} ativos · ${organico.length} total`}
          icon={Leaf}
          delay={4}
          tooltip={`Receita ativa: ${formatCurrencyBR(orgReceitaAtiva)} (${orgPagos.length} pagos)`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="lg:col-span-2 glass-card p-3 sm:p-4">
          <h4 className="font-heading font-bold text-foreground text-xs sm:text-sm mb-3">Distribuição por Canal</h4>
          <div className="flex flex-col items-center gap-3">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={72} paddingAngle={3} dataKey="value" stroke={strokeColor} strokeWidth={2}>
                  {pieData.map(e => (
                    <Cell key={e.name} fill={CHANNEL_COLORS[e.name === "Tráfego Pago" ? "TRÁFEGO PAGO" : "ORGÂNICO"]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: "8px", color: tooltipColor, fontSize: "12px", fontWeight: 500, padding: "6px 10px" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full space-y-1.5">
              {pieData.map(e => (
                <div key={e.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHANNEL_COLORS[e.name === "Tráfego Pago" ? "TRÁFEGO PAGO" : "ORGÂNICO"] }} />
                    <span className="text-xs text-muted-foreground">{e.name}</span>
                  </div>
                  <span className="text-xs font-bold text-foreground tabular-nums">{e.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 glass-card p-3 sm:p-4">
          <h4 className="font-heading font-bold text-foreground text-xs sm:text-sm mb-3">Receita por Canal</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueData} margin={{ left: 0, right: 5, top: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="tpGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(262 83% 58%)" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="hsl(262 83% 45%)" stopOpacity={0.5} />
                </linearGradient>
                <linearGradient id="orgGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(160 84% 45%)" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="hsl(160 84% 35%)" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: tickColor, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} width={45} />
              <Tooltip
                formatter={(value: number) => [formatCurrencyBR(value), "Receita"]}
                contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: "8px", color: tooltipColor, fontSize: "12px", fontWeight: 500, padding: "6px 10px" }}
              />
              <Bar dataKey="receita" radius={[6, 6, 0, 0]} maxBarSize={60}>
                {revenueData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? "url(#tpGrad)" : "url(#orgGrad)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card p-3 sm:p-4">
        <h4 className="font-heading font-bold text-foreground text-xs sm:text-sm mb-3">
          Clientes — {channel === "TODOS" ? "Todos os Canais" : channel} ({filtered.length})
        </h4>
        <div className="overflow-x-auto -mx-3 sm:-mx-4">
          <table className="w-full text-[10px] sm:text-xs">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-2 sm:px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider first:pl-3 sm:first:pl-4">Empresa</th>
                <th className="px-2 sm:px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider">Canal</th>
                <th className="px-2 sm:px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider">Situação</th>
                <th className="px-2 sm:px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider">Valor Fixo</th>
                <th className="px-2 sm:px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider">Gestão</th>
                <th className="px-2 sm:px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider">Closer</th>
                <th className="px-2 sm:px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider">Agender</th>
                <th className="px-2 sm:px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider last:pr-3 sm:last:pr-4">Região</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((c, i) => (
                <tr key={`${c.empresa}-${c.regiao}-${i}`} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                  <td className="px-2 sm:px-3 py-2 font-medium text-foreground whitespace-nowrap first:pl-3 sm:first:pl-4 max-w-[180px] truncate">{c.empresa}</td>
                  <td className="px-2 sm:px-3 py-2 whitespace-nowrap">
                    <span className={`px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-semibold ${
                      c.canal === "TRÁFEGO PAGO" ? "bg-primary/10 text-primary" : "bg-success/10 text-success"
                    }`}>
                      {c.canal === "TRÁFEGO PAGO" ? "Pago" : "Orgânico"}
                    </span>
                  </td>
                  <td className="px-2 sm:px-3 py-2 whitespace-nowrap">
                    <span className={`px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-semibold ${SITUACAO_BADGE[c.situacao] || "bg-muted text-muted-foreground"}`}>
                      {c.situacao}
                    </span>
                  </td>
                  <td className="px-2 sm:px-3 py-2 text-foreground tabular-nums whitespace-nowrap">{formatCurrencyBR(c.valorFixo)}</td>
                  <td className="px-2 sm:px-3 py-2 text-muted-foreground whitespace-nowrap">{c.gestao}</td>
                  <td className="px-2 sm:px-3 py-2 text-muted-foreground whitespace-nowrap">{c.closer || "-"}</td>
                  <td className="px-2 sm:px-3 py-2 text-muted-foreground whitespace-nowrap">{c.agender || "-"}</td>
                  <td className="px-2 sm:px-3 py-2 whitespace-nowrap last:pr-3 sm:last:pr-4">
                    <span className={`px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-semibold ${c.regiao === "SP" ? "bg-info/10 text-info" : "bg-warning/10 text-warning"}`}>
                      {c.regiao === "SP" ? "SP" : "SSA"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 100 && (
            <p className="text-center text-[10px] text-muted-foreground py-2">
              Mostrando 100 de {filtered.length}. Filtre por canal para refinar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
