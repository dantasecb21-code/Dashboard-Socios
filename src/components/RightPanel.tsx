import { Pencil, TrendingUp, Check, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ClientTableRow } from "@/components/ClientTable";
import type { Client } from "@/data/clients";
import { formatCurrencyBR } from "@/data/financeiro";

type Props = {
  clients: ClientTableRow[];
  revenueClients?: Client[];
  receitaMensal?: number;
  metaMensal?: number;
};

const NOTE_KEY = "mibusca:nota-do-dia";
const DEFAULT_NOTE = "Disciplina financeira hoje, liberdade amanhã.";

const RightPanel = ({ clients, revenueClients = [] }: Props) => {
  const [note, setNote] = useState<string>(DEFAULT_NOTE);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(NOTE_KEY);
      if (saved) setNote(saved);
    } catch {}
  }, []);

  const startEdit = () => {
    setDraft(note);
    setEditing(true);
  };

  const saveEdit = () => {
    const v = draft.trim() || DEFAULT_NOTE;
    setNote(v);
    try { localStorage.setItem(NOTE_KEY, v); } catch {}
    setEditing(false);
  };

  const topClients = useMemo(() => {
    // Dedup by empresa, mantendo o maior faturamentoUltimoMes (linhas IFOOD/99FOOD/COMPLETA têm o faturamento real)
    const map = new Map<string, Client & { _growth: number }>();
    for (const c of revenueClients) {
      const g = (c.gestao || "").toUpperCase();
      const isFood = g.includes("IFOOD") || g.includes("99FOOD") || g.includes("99 FOOD") || g.includes("COMPLETA");
      if (!isFood) continue;
      if (!c.faturamentoUltimoMes || c.faturamentoUltimoMes <= 0) continue;

      const inicial = c.faturamentoInicial || 0;
      const growth = inicial > 0 ? ((c.faturamentoUltimoMes - inicial) / inicial) * 100 : 0;
      if (growth <= 0) continue; // só clientes que cresceram

      const key = (c.empresa || "").toUpperCase().trim();
      const existing = map.get(key);
      if (!existing || c.faturamentoUltimoMes > existing.faturamentoUltimoMes) {
        map.set(key, { ...c, _growth: growth });
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.faturamentoUltimoMes - a.faturamentoUltimoMes)
      .slice(0, 5);
  }, [revenueClients]);

  const initials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("");

  const platformBadge = (gestao: string) => {
    const g = (gestao || "").toUpperCase();
    const isIfood = g.includes("IFOOD") || g.includes("COMPLETA");
    const is99 = g.includes("99FOOD") || g.includes("99 FOOD");
    if (isIfood && is99) return { label: "iFood + 99", cls: "bg-gradient-to-r from-destructive/20 to-yellow-500/20 text-foreground border-white/15" };
    if (isIfood) return { label: "iFood", cls: "bg-destructive/15 text-destructive border-destructive/30" };
    if (is99) return { label: "99Food", cls: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30" };
    return null;
  };

  return (
    <aside className="w-full xl:w-[320px] shrink-0 flex flex-col gap-3 sm:gap-4">
      {/* Nota do dia */}
      <div className="glass-card p-4 sm:p-5 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full bg-primary/20 blur-3xl" />
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-heading font-extrabold text-foreground text-[15px] tracking-tight">Nota do dia</h3>
          {!editing ? (
            <button
              onClick={startEdit}
              className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Editar nota"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={saveEdit}
                className="w-7 h-7 rounded-lg bg-success/20 hover:bg-success/30 border border-success/30 flex items-center justify-center text-success transition-colors"
                aria-label="Salvar"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setEditing(false)}
                className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Cancelar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
        {!editing ? (
          <>
            <p className="text-[13px] leading-relaxed text-foreground/85 italic">
              <span className="text-primary text-lg leading-none align-top mr-0.5">"</span>
              {note}
            </p>
            <p className="mt-3 text-[11px] text-muted-foreground font-semibold">— Mibusca</p>
          </>
        ) : (
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) saveEdit();
              if (e.key === "Escape") setEditing(false);
            }}
            rows={3}
            placeholder="Escreva sua nota do dia..."
            className="w-full text-[13px] leading-relaxed bg-white/[0.04] border border-white/10 rounded-lg p-2.5 text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:bg-white/[0.06] resize-none"
          />
        )}
      </div>

      <div className="glass-card p-4 sm:p-5 relative overflow-hidden">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-heading font-extrabold text-foreground text-[15px] tracking-tight">Top Clientes</h3>
          <button className="text-[11px] font-bold text-primary hover:text-accent transition-colors">​</button>
        </div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-3">Maior faturamento · último mês</p>

        <ul className="flex flex-col gap-2.5">
          {topClients.length === 0 && (
            <li className="text-[12px] text-muted-foreground py-2">Sem dados de iFood/99Food.</li>
          )}
          {topClients.map((c: any, i) => {
            const badge = platformBadge(c.gestao);
            return (
              <li key={`${c.id || c.empresa}-${i}`} className="flex items-center gap-3 group">
                <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-primary/40 to-accent/30 border border-white/15 flex items-center justify-center text-[11px] font-extrabold text-foreground shrink-0">
                  {initials(c.empresa) || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-bold text-foreground truncate leading-tight">{c.empresa}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {badge && (
                      <span className={`text-[8px] px-1 py-0.5 rounded-md font-bold border ${badge.cls}`}>
                        {badge.label}
                      </span>
                    )}
                    <p className="text-[10.5px] text-muted-foreground truncate leading-tight">{c.gestor || "—"}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[12px] font-extrabold text-foreground tabular-nums leading-tight">{formatCurrencyBR(c.faturamentoUltimoMes)}</p>
                  <p className="text-[10px] text-success font-bold leading-tight mt-0.5 flex items-center justify-end gap-0.5">
                    <TrendingUp className="w-2.5 h-2.5" /> +{c._growth.toFixed(1)}%
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
};

export default RightPanel;
