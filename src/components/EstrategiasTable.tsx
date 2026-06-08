import { useState, useMemo } from "react";
import { Search, FileSpreadsheet } from "lucide-react";
import { Estrategia } from "@/services/estrategiasService";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { exportToExcel } from "@/lib/excelExport";

interface Props {
  estrategias: Estrategia[];
}

function statusColor(status: string): string {
  switch (status) {
    case "Concluída": return "bg-accent/15 text-accent border-accent/30";
    case "Em andamento": return "bg-info/15 text-info border-info/30";
    case "Aprovada": return "bg-success/15 text-success border-success/30";
    case "Aguardando aprovação": return "bg-warning/15 text-warning border-warning/30";
    case "Cancelada": return "bg-destructive/15 text-destructive border-destructive/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

function prazoColor(prazo: string): string {
  switch (prazo) {
    case "No prazo": return "text-success";
    case "Vencendo": return "text-warning";
    case "Atrasada": return "text-destructive";
    default: return "text-muted-foreground";
  }
}

function plataformaBadge(p: string) {
  if (p === "99Food") return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-warning/15 text-warning border border-warning/30">99Food</span>;
  if (p === "iFood") return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-destructive/15 text-destructive border border-destructive/30">iFood</span>;
  return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-muted text-muted-foreground">{p}</span>;
}

function formatDateBR(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function calcDays(from: string | null, to: string | null): string {
  if (!from || !to) return "—";
  const diff = Math.round((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? `${diff}d` : "—";
}

const EstrategiasTable = ({ estrategias }: Props) => {
  const [search, setSearch] = useState("");
  const [filterPlat, setFilterPlat] = useState("TODAS");
  const [filterGestor, setFilterGestor] = useState("TODOS");

  const gestores = useMemo(() => {
    const set = new Set(estrategias.map(e => e.gestorOperacional).filter(Boolean));
    return Array.from(set).sort();
  }, [estrategias]);

  const filtered = useMemo(() => {
    return estrategias.filter(e => {
      if (filterPlat !== "TODAS" && e.plataforma !== filterPlat) return false;
      if (filterGestor !== "TODOS" && e.gestorOperacional !== filterGestor) return false;
      if (search) {
        const q = search.toLowerCase();
        return e.loja.toLowerCase().includes(q) || e.gestorOperacional.toLowerCase().includes(q) || e.gestorEstrategico.toLowerCase().includes(q);
      }
      return true;
    });
  }, [estrategias, filterPlat, filterGestor, search]);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-border flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar loja ou gestor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
        <select
          value={filterPlat}
          onChange={e => setFilterPlat(e.target.value)}
          className="text-xs bg-secondary border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        >
          <option value="TODAS">Todas plataformas</option>
          <option value="iFood">iFood</option>
          <option value="99Food">99Food</option>
        </select>
        <select
          value={filterGestor}
          onChange={e => setFilterGestor(e.target.value)}
          className="text-xs bg-secondary border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        >
          <option value="TODOS">Todos gestores</option>
          {gestores.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <span className="text-[10px] text-muted-foreground">{filtered.length} de {estrategias.length}</span>
        <button
          onClick={() => {
            const ts = new Date();
            const stamp = `${ts.getFullYear()}${String(ts.getMonth()+1).padStart(2,"0")}${String(ts.getDate()).padStart(2,"0")}`;
            exportToExcel({
              filename: `estrategias-${stamp}`,
              sheetName: "Estratégias",
              rows: filtered,
              columns: [
                { header: "Loja", value: e => e.loja, width: 28 },
                { header: "Plataforma", value: e => e.plataforma, width: 12 },
                { header: "Tipo", value: e => e.tipoEstrategia || "", width: 18 },
                { header: "Gestor Operacional", value: e => e.gestorOperacional || "", width: 20 },
                { header: "Gestor Estratégico", value: e => e.gestorEstrategico || "", width: 20 },
                { header: "Status", value: e => e.statusOperacional || "", width: 18 },
                { header: "Status Prazo", value: e => e.statusPrazo || "", width: 14 },
                { header: "Data Criação", value: e => e.dataCriacao ? formatDateBR(e.dataCriacao) : "", width: 12 },
                { header: "Data Início", value: e => e.dataInicio ? formatDateBR(e.dataInicio) : "", width: 12 },
                { header: "Deadline", value: e => e.dataEntregaPrevista ? formatDateBR(e.dataEntregaPrevista) : "", width: 12 },
                { header: "Conclusão", value: e => e.dataConclusao ? formatDateBR(e.dataConclusao) : "", width: 12 },
                { header: "T. Criação (dias)", value: e => {
                  const d = calcDays(e.dataCriacaoLoja, e.dataCriacao);
                  const n = parseInt(d, 10);
                  return isNaN(n) ? "" : n;
                }, width: 14 },
                { header: "T. Execução (dias)", value: e => {
                  const d = calcDays(e.dataInicio, e.dataConclusao);
                  const n = parseInt(d, 10);
                  return isNaN(n) ? "" : n;
                }, width: 14 },
              ],
            });
          }}
          className="ml-auto px-3 py-1.5 text-xs font-semibold rounded-lg bg-success text-success-foreground hover:bg-success/90 transition-all flex items-center gap-1.5 whitespace-nowrap"
          title="Exportar estratégias filtradas para Excel"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Excel
        </button>
      </div>

      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              <TableHead className="text-[10px] uppercase tracking-wider font-bold">Loja</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-bold">Plataforma</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-bold">Tipo</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-bold">Gestor Op.</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-bold">Status</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-bold">Prazo</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-bold">Deadline</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-bold">Conclusão</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-bold">T. Criação</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-bold">T. Execução</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">
                  Nenhuma estratégia encontrada
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((e) => (
                <TableRow key={e.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-xs font-medium text-foreground max-w-[200px] truncate">{e.loja}</TableCell>
                  <TableCell>{plataformaBadge(e.plataforma)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.tipoEstrategia || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.gestorOperacional || "—"}</TableCell>
                  <TableCell>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${statusColor(e.statusOperacional)}`}>
                      {e.statusOperacional || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-semibold ${prazoColor(e.statusPrazo)}`}>
                      {e.statusPrazo || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDateBR(e.dataEntregaPrevista)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDateBR(e.dataConclusao)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{calcDays(e.dataCriacaoLoja, e.dataCriacao)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{calcDays(e.dataInicio, e.dataConclusao)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default EstrategiasTable;
