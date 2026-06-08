import * as XLSX from "xlsx";

export type ExcelColumn<T> = {
  header: string;
  /** Returns a primitive (string | number | null) for the cell. Numbers stay numeric in Excel. */
  value: (row: T) => string | number | null | undefined;
  /** Optional Excel number format (e.g. "0%", "R$ #,##0", "dd/mm/yyyy") */
  numFmt?: string;
  /** Optional column width (in chars) */
  width?: number;
};

export function exportToExcel<T>(opts: {
  filename: string;
  sheetName?: string;
  rows: T[];
  columns: ExcelColumn<T>[];
}) {
  const { filename, rows, columns } = opts;
  const sheetName = (opts.sheetName || "Dados").slice(0, 31);

  const header = columns.map((c) => c.header);
  const body = rows.map((r) =>
    columns.map((c) => {
      const v = c.value(r);
      return v === undefined || v === null ? "" : v;
    })
  );

  const ws = XLSX.utils.aoa_to_sheet([header, ...body]);

  // Column widths
  ws["!cols"] = columns.map((c) => ({ wch: c.width ?? Math.max(10, c.header.length + 2) }));

  // Apply number formats
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  for (let c = 0; c < columns.length; c++) {
    const fmt = columns[c].numFmt;
    if (!fmt) continue;
    for (let r = 1; r <= range.e.r; r++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (cell && cell.v !== "" && cell.v !== null && cell.v !== undefined) {
        cell.z = fmt;
      }
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const finalName = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, finalName);
}
