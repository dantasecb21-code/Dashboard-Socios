import { useMemo, useState } from "react";
import { X, Download, FileText, FileSpreadsheet } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { exportToExcel } from "@/lib/excelExport";
import { formatDias, type FolhaItem } from "@/services/rhFolhaService";
import { formatCurrencyBR } from "@/data/financeiro";
import { cn } from "@/lib/utils";

type Format = "PDF" | "EXCEL";
type SortKey = "DIA" | "VALOR_DESC" | "VALOR_ASC" | "NOME" | "SETOR" | "CATEGORIA" | "PAGO";
type GroupKey = "NENHUM" | "SETOR" | "CATEGORIA" | "MES" | "PAGO";

interface Props {
  open: boolean;
  onClose: () => void;
  rows: FolhaItem[]; // já filtrados pela tela
}

const ALL_COLUMNS = [
  { key: "categoria", label: "Categoria" },
  { key: "mes", label: "Mês" },
  { key: "dia", label: "Dia" },
  { key: "nome", label: "Nome" },
  { key: "setor", label: "Setor" },
  { key: "contato", label: "Contato" },
  { key: "valor", label: "Valor" },
  { key: "pago", label: "Pago" },
  { key: "obs", label: "Observações" },
] as const;

const DEFAULT_COLS = ["categoria", "mes", "dia", "nome", "setor", "valor", "pago"];

const SORT_LABELS: Record<SortKey, string> = {
  DIA: "Data de pagamento (dia)",
  VALOR_DESC: "Valor (maior → menor)",
  VALOR_ASC: "Valor (menor → maior)",
  NOME: "Nome (A → Z)",
  SETOR: "Setor (A → Z)",
  CATEGORIA: "Categoria",
  PAGO: "Status (pago/pendente)",
};

const GROUP_LABELS: Record<GroupKey, string> = {
  NENHUM: "Sem agrupamento",
  SETOR: "Por setor",
  CATEGORIA: "Por categoria",
  MES: "Por mês",
  PAGO: "Por status (pago/pendente)",
};

const cellValue = (r: FolhaItem, key: string): string => {
  switch (key) {
    case "categoria": return r.categoria === "FOLHA" ? "Custo Fixo" : "Variável";
    case "mes": return r.mes;
    case "dia": return r.dataDisplay?.trim() || formatDias(r.dias);
    case "nome": return r.nome;
    case "setor": return r.setor || "—";
    case "contato": return r.contato || "—";
    case "valor": return r.valorDisplay || formatCurrencyBR(r.valor);
    case "pago":
      return r.pago === "PAGO" ? "PAGO" : r.pago === "NAO" ? "PENDENTE" : (r.pagoRaw || "—");
    case "obs": return r.obs || "";
    default: return "";
  }
};

const groupKey = (r: FolhaItem, g: GroupKey): string => {
  switch (g) {
    case "SETOR": return r.setor || "Sem setor";
    case "CATEGORIA": return r.categoria === "FOLHA" ? "Custo Fixo (Folha)" : "Variável";
    case "MES": return r.mes;
    case "PAGO": return r.pago === "PAGO" ? "Pago" : "Pendente";
    default: return "";
  }
};

const RhFolhaExportModal = ({ open, onClose, rows }: Props) => {
  const [format, setFormat] = useState<Format>("PDF");
  const [title, setTitle] = useState("Folha & Contas — Painel de Gestão");
  const [sortKey, setSortKey] = useState<SortKey>("DIA");
  const [groupBy, setGroupBy] = useState<GroupKey>("NENHUM");
  const [selectedCols, setSelectedCols] = useState<string[]>(DEFAULT_COLS);
  const [showTotals, setShowTotals] = useState(true);

  const toggleCol = (key: string) => {
    setSelectedCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      switch (sortKey) {
        case "DIA": {
          const da = a.dias[0] ?? 99;
          const db = b.dias[0] ?? 99;
          if (da !== db) return da - db;
          return a.nome.localeCompare(b.nome, "pt-BR");
        }
        case "VALOR_DESC": return b.valor - a.valor;
        case "VALOR_ASC": return a.valor - b.valor;
        case "NOME": return a.nome.localeCompare(b.nome, "pt-BR");
        case "SETOR": return (a.setor || "").localeCompare(b.setor || "", "pt-BR");
        case "CATEGORIA": return a.categoria.localeCompare(b.categoria);
        case "PAGO": return (a.pago || "Z").localeCompare(b.pago || "Z");
      }
    });
    return arr;
  }, [rows, sortKey]);

  const grouped = useMemo<Array<{ label: string; items: FolhaItem[]; total: number }>>(() => {
    if (groupBy === "NENHUM") {
      const total = sorted.reduce((s, r) => s + r.valor, 0);
      return [{ label: "", items: sorted, total }];
    }
    const map = new Map<string, FolhaItem[]>();
    sorted.forEach(r => {
      const k = groupKey(r, groupBy);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0], "pt-BR"))
      .map(([label, items]) => ({
        label,
        items,
        total: items.reduce((s, r) => s + r.valor, 0),
      }));
  }, [sorted, groupBy]);

  const totalGeral = useMemo(() => sorted.reduce((s, r) => s + r.valor, 0), [sorted]);

  const handleExportPDF = () => {
    const cols = ALL_COLUMNS.filter(c => selectedCols.includes(c.key));
    if (cols.length === 0) return;
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const now = new Date();

    doc.setFontSize(15);
    doc.setTextColor(20);
    doc.text(title, 40, 42);
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(
      `Gerado em ${now.toLocaleString("pt-BR")}  •  ${sorted.length} itens  •  Total: ${formatCurrencyBR(totalGeral)}`,
      40, 58
    );
    doc.text(
      `Ordenação: ${SORT_LABELS[sortKey]}  •  ${GROUP_LABELS[groupBy]}`,
      40, 72
    );

    const valorIdx = cols.findIndex(c => c.key === "valor");
    const rightAlign = new Set(["valor"]);
    let startY = 88;

    grouped.forEach((g, gi) => {
      if (groupBy !== "NENHUM") {
        if (gi > 0) startY += 6;
        doc.setFontSize(11);
        doc.setTextColor(60);
        doc.text(
          `${g.label}  •  ${g.items.length} item(ns)  •  ${formatCurrencyBR(g.total)}`,
          40, startY
        );
        startY += 6;
      }

      autoTable(doc, {
        startY,
        head: [cols.map(c => c.label)],
        body: g.items.map(r => cols.map(c => cellValue(r, c.key))),
        foot: showTotals ? [cols.map((c, i) =>
          i === 0 ? "Total" : c.key === "valor" ? formatCurrencyBR(g.total) : ""
        )] : undefined,
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: "bold" },
        footStyles: { fillColor: [240, 235, 250], textColor: 30, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 247, 252] },
        columnStyles: cols.reduce((acc, c, i) => {
          if (rightAlign.has(c.key)) acc[i] = { halign: "right" };
          return acc;
        }, {} as Record<number, { halign: "right" }>),
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === cols.findIndex(c => c.key === "pago")) {
            const txt = String(data.cell.raw || "").toUpperCase();
            if (txt === "PAGO") { data.cell.styles.textColor = [22, 130, 70]; data.cell.styles.fontStyle = "bold"; }
            else if (txt === "PENDENTE") { data.cell.styles.textColor = [200, 130, 30]; data.cell.styles.fontStyle = "bold"; }
          }
        },
      });
      startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    });

    if (showTotals && groupBy !== "NENHUM") {
      doc.setFontSize(11);
      doc.setTextColor(20);
      doc.text(`Total geral: ${formatCurrencyBR(totalGeral)}`, 40, startY + 6);
    }

    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    doc.save(`folha-contas-${ts}.pdf`);
    onClose();
  };

  const handleExportExcel = () => {
    const cols = ALL_COLUMNS.filter(c => selectedCols.includes(c.key));
    if (cols.length === 0) return;
    // achata grupos: insere linha de cabeçalho de grupo
    const flat: Array<FolhaItem & { __group?: string }> = [];
    grouped.forEach(g => {
      g.items.forEach(it => flat.push({ ...it, __group: g.label }));
    });
    exportToExcel({
      filename: `folha-contas-${new Date().toISOString().slice(0, 10)}`,
      sheetName: "Folha",
      rows: flat,
      columns: [
        ...(groupBy !== "NENHUM"
          ? [{ header: GROUP_LABELS[groupBy], value: (r: FolhaItem & { __group?: string }) => r.__group ?? "", width: 22 }]
          : []),
        ...cols.map(c => ({
          header: c.label,
          value: (r: FolhaItem) => c.key === "valor" ? r.valor : cellValue(r, c.key),
          width: c.key === "obs" ? 60 : c.key === "nome" ? 28 : 18,
          numFmt: c.key === "valor" ? "R$ #,##0.00" : undefined,
        })),
      ],
    });
    onClose();
  };

  const handleExport = () => {
    if (format === "PDF") handleExportPDF(); else handleExportExcel();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <h2 className="text-base font-bold text-foreground">Exportar Folha & Contas</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          {/* Formato */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Formato</label>
            <div className="inline-flex rounded-lg border border-border bg-secondary p-0.5">
              {(["PDF", "EXCEL"] as Format[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={cn(
                    "px-4 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors",
                    format === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f === "PDF" ? <FileText className="w-3.5 h-3.5" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                  {f === "PDF" ? "PDF" : "Excel"}
                </button>
              ))}
            </div>
          </div>

          {format === "PDF" && (
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Título do relatório</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Ordenar por</label>
              <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30">
                {(Object.keys(SORT_LABELS) as SortKey[]).map(k => (
                  <option key={k} value={k}>{SORT_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Agrupar</label>
              <select value={groupBy} onChange={e => setGroupBy(e.target.value as GroupKey)} className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30">
                {(Object.keys(GROUP_LABELS) as GroupKey[]).map(k => (
                  <option key={k} value={k}>{GROUP_LABELS[k]}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Colunas</label>
            <div className="flex flex-wrap gap-2">
              {ALL_COLUMNS.map(c => {
                const sel = selectedCols.includes(c.key);
                return (
                  <button
                    key={c.key}
                    onClick={() => toggleCol(c.key)}
                    className={cn(
                      "px-3 py-1 text-xs rounded-md border transition-colors",
                      sel ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={showTotals} onChange={e => setShowTotals(e.target.checked)} className="accent-primary" />
            Mostrar totais (por grupo e geral)
          </label>

          <div className="rounded-lg bg-secondary/50 border border-border px-3 py-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{sorted.length}</span> itens •
            Total: <span className="font-semibold text-foreground">{formatCurrencyBR(totalGeral)}</span> •
            {grouped.length > 1 && <> {grouped.length} grupos</>}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-border flex justify-end gap-2 bg-muted/20">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg text-muted-foreground hover:bg-muted">
            Cancelar
          </button>
          <button
            onClick={handleExport}
            disabled={selectedCols.length === 0 || sorted.length === 0}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar {format === "PDF" ? "PDF" : "Excel"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RhFolhaExportModal;
