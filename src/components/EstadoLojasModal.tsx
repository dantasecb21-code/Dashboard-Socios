import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MapPin, Store, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronRight } from "lucide-react";
import { formatCurrencyBR } from "@/data/financeiro";
import type { EstadosLojaRow } from "@/hooks/useEstadosAnalise";

interface EstadoLojasModalProps {
  open: boolean;
  onClose: () => void;
  estado: string | null;
  lojas: EstadosLojaRow[];
}

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

const VarIcon = ({ v }: { v: number | null }) => {
  if (v === null) return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
  if (v > 0.5) return <TrendingUp className="w-3.5 h-3.5 text-success" />;
  if (v < -0.5) return <TrendingDown className="w-3.5 h-3.5 text-destructive" />;
  return <Minus className="w-3.5 h-3.5 text-warning" />;
};

const EstadoLojasModal = ({ open, onClose, estado, lojas }: EstadoLojasModalProps) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const sorted = [...lojas].sort((a, b) => b.fatAtual - a.fatAtual);
  const totalAtual = sorted.reduce((s, r) => s + r.fatAtual, 0);
  const totalAnterior = sorted.reduce((s, r) => s + r.fatAnterior, 0);
  const variacaoTotal = totalAnterior > 0 ? ((totalAtual - totalAnterior) / totalAnterior) * 100 : null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Lojas em {estado}
          </DialogTitle>
          <DialogDescription>
            {sorted.length} {sorted.length === 1 ? "loja" : "lojas"} mapeadas neste estado
          </DialogDescription>
        </DialogHeader>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-lg border border-border bg-secondary/40 p-3">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Fat. Inicial</div>
            <div className="text-sm font-bold text-foreground">{formatCurrencyBR(totalAtual)}</div>
          </div>
          <div className="rounded-lg border border-border bg-secondary/40 p-3">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Mês Anterior</div>
            <div className="text-sm font-bold text-foreground">{formatCurrencyBR(totalAnterior)}</div>
          </div>
          <div className="rounded-lg border border-border bg-secondary/40 p-3">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Variação</div>
            <div className={`text-sm font-bold flex items-center gap-1 ${pctClass(variacaoTotal)}`}>
              <VarIcon v={variacaoTotal} />
              {fmtPct(variacaoTotal)}
            </div>
          </div>
        </div>

        {/* Lista */}
        <div className="overflow-y-auto flex-1 -mx-6 px-6">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background border-b border-border z-10">
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="py-2 font-semibold w-6"></th>
                <th className="py-2 font-semibold">ID</th>
                <th className="py-2 font-semibold">Loja</th>
                <th className="py-2 font-semibold">Gestor</th>
                <th className="py-2 font-semibold">Nicho</th>
                <th className="py-2 font-semibold text-right">Fat. Inicial</th>
                <th className="py-2 font-semibold text-right">Mês Ant.</th>
                <th className="py-2 font-semibold text-right">Var.</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-muted-foreground text-xs">
                    <Store className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    Nenhuma loja encontrada.
                  </td>
                </tr>
              ) : (
                sorted.map((l) => {
                  const isOpen = expanded === l.empresaKey;
                  return (
                    <>
                      <tr
                        key={l.empresaKey}
                        className="border-b border-border/40 hover:bg-secondary/30 cursor-pointer"
                        onClick={() => setExpanded(isOpen ? null : l.empresaKey)}
                      >
                        <td className="py-2 pr-1 text-muted-foreground">
                          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </td>
                        <td className="py-2 pr-2 text-muted-foreground text-xs font-mono">{l.id || "—"}</td>
                        <td className="py-2 pr-2">
                          <div className="font-semibold text-foreground truncate max-w-[200px]" title={l.loja}>{l.loja}</div>
                          <div className="text-[10px] text-muted-foreground">{l.plataforma}</div>
                        </td>
                        <td className="py-2 pr-2 text-muted-foreground text-xs">{l.gestor || "—"}</td>
                        <td className="py-2 pr-2 text-muted-foreground text-xs">{l.nicho || "—"}</td>
                        <td className="py-2 pr-2 text-right text-foreground">{formatCurrencyBR(l.fatAtual)}</td>
                        <td className="py-2 pr-2 text-right text-muted-foreground">{formatCurrencyBR(l.fatAnterior)}</td>
                        <td className={`py-2 text-right font-bold text-xs ${pctClass(l.variacaoPct)}`}>{fmtPct(l.variacaoPct)}</td>
                      </tr>
                      {isOpen && (
                        <tr key={`${l.empresaKey}-details`} className="bg-secondary/20 border-b border-border/40">
                          <td colSpan={8} className="px-4 py-3">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                              <Detail label="ID" value={l.id} mono />
                              <Detail label="Status Loja" value={l.statusLoja} />
                              <Detail label="Status Performance" value={l.status} />
                              <Detail label="Estrategista" value={l.estrategista} />
                              <Detail label="Fidelidade" value={l.fidelidade} />
                              <Detail label="Garantia" value={l.garantia} />
                              <Detail label="Tempo Aberto" value={l.tempoAberto} />
                              <Detail label="Fat. Últ. 15d" value={l.fatUlt15 != null ? formatCurrencyBR(l.fatUlt15) : "—"} />
                              <Detail label="Data Entrada" value={l.dataEntrada} />
                              <Detail label="Última Estratégia" value={l.dataUltimaEstrategia} />
                              <Detail label="Última Atualização" value={l.ultAtualizacao} />
                              <Detail label="Variação Status" value={fmtPct(l.variacaoPctStatus)} />
                              {l.observacao && (
                                <div className="col-span-2 sm:col-span-3 lg:col-span-4">
                                  <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-0.5">Observação</div>
                                  <div className="text-foreground whitespace-pre-wrap">{l.observacao}</div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Detail = ({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) => (
  <div>
    <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-0.5">{label}</div>
    <div className={`text-foreground ${mono ? "font-mono" : ""}`}>{value || "—"}</div>
  </div>
);

export default EstadoLojasModal;
