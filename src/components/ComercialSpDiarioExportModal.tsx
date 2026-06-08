import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { exportToExcel } from "@/lib/excelExport";
import { DiarioRecord, STATUS_LABELS } from "@/services/comercialSpDiarioService";

export type DiarioColumnKey =
  | "aba" | "dataAgendamento" | "agender" | "proprietario" | "loja"
  | "dataReuniao" | "horario" | "telefone" | "link" | "obs"
  | "statusRaw" | "status" | "closer" | "assunto";

const ALL_COLUMNS: { key: DiarioColumnKey; label: string; width: number; value: (r: DiarioRecord) => string | number }[] = [
  { key: "aba", label: "Data (Aba)", width: 14, value: r => r.aba },
  { key: "dataAgendamento", label: "Data Agendamento", width: 18, value: r => r.dataAgendamento },
  { key: "agender", label: "Agender", width: 16, value: r => r.agender },
  { key: "proprietario", label: "Proprietário", width: 18, value: r => r.proprietario },
  { key: "loja", label: "Nome da Loja", width: 26, value: r => r.loja },
  { key: "dataReuniao", label: "Data da Reunião", width: 16, value: r => r.dataReuniao },
  { key: "horario", label: "Horário", width: 10, value: r => r.horario },
  { key: "telefone", label: "Telefone", width: 16, value: r => r.telefone },
  { key: "link", label: "Link", width: 30, value: r => r.link },
  { key: "obs", label: "Observação", width: 30, value: r => r.obs },
  { key: "status", label: "Status", width: 14, value: r => STATUS_LABELS[r.status] },
  { key: "statusRaw", label: "Status (original)", width: 16, value: r => r.statusRaw },
  { key: "closer", label: "Closer", width: 16, value: r => r.closer },
  { key: "assunto", label: "Assunto", width: 24, value: r => r.assunto },
];

const DEFAULT_KEYS: DiarioColumnKey[] = ["aba", "agender", "loja", "dataReuniao", "horario", "closer", "status", "link"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rows: DiarioRecord[];
  filtroAba: string;
  filtroAgender: string;
  filtroStatus: string;
}

export default function ComercialSpDiarioExportModal({ open, onOpenChange, rows, filtroAba, filtroAgender, filtroStatus }: Props) {
  const [selected, setSelected] = useState<DiarioColumnKey[]>(DEFAULT_KEYS);
  const [format, setFormat] = useState<"excel" | "pdf">("excel");
  const [filename, setFilename] = useState("");

  const toggle = (k: DiarioColumnKey) => setSelected(s => s.includes(k) ? s.filter(x => x !== k) : [...s, k]);
  const allSelected = selected.length === ALL_COLUMNS.length;

  const slug = (s: string) => s.toLowerCase().replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");
  const baseName = filename.trim() || `comercial-sp-diario${filtroAba !== "TODAS" ? `-${slug(filtroAba)}` : ""}${filtroAgender !== "TODOS" ? `-${slug(filtroAgender)}` : ""}${filtroStatus !== "TODOS" ? `-${slug(filtroStatus)}` : ""}`;

  const handleExport = async () => {
    const cols = ALL_COLUMNS.filter(c => selected.includes(c.key));
    if (cols.length === 0) return;

    if (format === "excel") {
      exportToExcel({
        filename: baseName,
        sheetName: "Diário",
        rows,
        columns: cols.map(c => ({ header: c.label, value: c.value, width: c.width })),
      });
    } else {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(14);
      doc.text(`Comercial SP — Controle Diário`, 14, 14);
      doc.setFontSize(9);
      doc.text(`Aba: ${filtroAba} • Agender: ${filtroAgender} • Status: ${filtroStatus} • ${rows.length} registro(s)`, 14, 20);
      autoTable(doc, {
        startY: 25,
        head: [cols.map(c => c.label)],
        body: rows.map(r => cols.map(c => String(c.value(r) ?? ""))),
        styles: { fontSize: 7 },
        headStyles: { fillColor: [100, 80, 220] },
      });
      doc.save(`${baseName}.pdf`);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Personalizar exportação</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setFormat("excel")}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-sm font-semibold transition ${format === "excel" ? "bg-success/15 text-success border-success/40" : "bg-secondary border-border text-muted-foreground hover:bg-muted"}`}
            >
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
            <button
              onClick={() => setFormat("pdf")}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-sm font-semibold transition ${format === "pdf" ? "bg-destructive/15 text-destructive border-destructive/40" : "bg-secondary border-border text-muted-foreground hover:bg-muted"}`}
            >
              <FileText className="w-4 h-4" /> PDF
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome do arquivo</label>
            <Input value={filename} onChange={e => setFilename(e.target.value)} placeholder={baseName} className="mt-1" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Colunas ({selected.length}/{ALL_COLUMNS.length})</label>
              <button
                onClick={() => setSelected(allSelected ? DEFAULT_KEYS : ALL_COLUMNS.map(c => c.key))}
                className="text-xs text-primary hover:underline"
              >
                {allSelected ? "Padrão" : "Selecionar todas"}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-auto p-2 rounded-md border border-border bg-muted/20">
              {ALL_COLUMNS.map(c => (
                <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer hover:text-foreground">
                  <Checkbox checked={selected.includes(c.key)} onCheckedChange={() => toggle(c.key)} />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">{rows.length} linha(s) serão exportadas.</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleExport} disabled={selected.length === 0} className="gap-2">
            <Download className="w-4 h-4" /> Baixar {format === "excel" ? "Excel" : "PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
