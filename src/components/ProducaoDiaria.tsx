import { useState, useMemo } from "react";
import { CalendarCheck, Play, CheckCircle, Filter, X } from "lucide-react";
import { Estrategia } from "@/services/estrategiasService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Props {
  estrategias: Estrategia[];
}

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

const ProducaoDiaria = ({ estrategias }: Props) => {
  const [gestorFilter, setGestorFilter] = useState("todos");
  const [setorFilter, setSetorFilter] = useState("todos");
  const [modalData, setModalData] = useState<{ title: string; items: Estrategia[] } | null>(null);

  const gestores = useMemo(() => {
    const set = new Set<string>();
    estrategias.forEach(e => {
      if (e.gestorOperacional?.trim()) set.add(e.gestorOperacional.trim());
    });
    return Array.from(set).sort();
  }, [estrategias]);

  const setores = useMemo(() => {
    const set = new Set<string>();
    estrategias.forEach(e => {
      if (e.plataforma?.trim()) set.add(e.plataforma.trim());
    });
    return Array.from(set).sort();
  }, [estrategias]);

  const filtered = useMemo(() => {
    return estrategias.filter(e => {
      if (gestorFilter !== "todos" && e.gestorOperacional?.trim() !== gestorFilter) return false;
      if (setorFilter !== "todos" && e.plataforma?.trim() !== setorFilter) return false;
      return true;
    });
  }, [estrategias, gestorFilter, setorFilter]);

  const paraEntregarHoje = useMemo(() => filtered.filter(e => isToday(e.dataEntregaPrevista) && e.statusOperacional !== "Concluída"), [filtered]);
  const emExecucaoHoje = useMemo(() => filtered.filter(e => e.statusOperacional === "Em andamento" && isToday(e.dataEntregaPrevista)), [filtered]);
  const concluidasHoje = useMemo(() => filtered.filter(e => isToday(e.dataConclusao)), [filtered]);

  const items = [
    { label: "Para entregar hoje", list: paraEntregarHoje, icon: CalendarCheck, color: "text-warning" },
    { label: "Em execução hoje", list: emExecucaoHoje, icon: Play, color: "text-info" },
    { label: "Concluídas hoje", list: concluidasHoje, icon: CheckCircle, color: "text-success" },
  ];

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Produção Diária</h3>
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <Select value={gestorFilter} onValueChange={setGestorFilter}>
              <SelectTrigger className="h-7 text-[10px] w-[140px] bg-secondary border-border">
                <SelectValue placeholder="Gestor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos gestores</SelectItem>
                {gestores.map(g => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={setorFilter} onValueChange={setSetorFilter}>
              <SelectTrigger className="h-7 text-[10px] w-[120px] bg-secondary border-border">
                <SelectValue placeholder="Setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos setores</SelectItem>
                {setores.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {items.map(({ label, list, icon: Icon, color }) => (
            <button
              key={label}
              onClick={() => list.length > 0 && setModalData({ title: label, items: list })}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-lg bg-secondary/50 transition-all ${
                list.length > 0 ? "cursor-pointer hover:bg-secondary/80 hover:ring-1 hover:ring-primary/30" : "cursor-default"
              }`}
            >
              <Icon className={`w-5 h-5 ${color}`} />
              <span className="text-2xl font-bold text-foreground">{list.length}</span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <Dialog open={!!modalData} onOpenChange={(open) => !open && setModalData(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">{modalData?.title}</DialogTitle>
          </DialogHeader>
          {modalData && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px]">Loja</TableHead>
                  <TableHead className="text-[10px]">Plataforma</TableHead>
                  <TableHead className="text-[10px]">Tipo</TableHead>
                  <TableHead className="text-[10px]">Gestor Op.</TableHead>
                  <TableHead className="text-[10px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modalData.items.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs font-medium">{e.loja}</TableCell>
                    <TableCell className="text-xs">{e.plataforma}</TableCell>
                    <TableCell className="text-xs">{e.tipoEstrategia}</TableCell>
                    <TableCell className="text-xs">{e.gestorOperacional || "Sem gestor"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{e.statusOperacional}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProducaoDiaria;
