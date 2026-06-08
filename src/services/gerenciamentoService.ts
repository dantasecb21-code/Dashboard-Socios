import { supabase } from "@/integrations/supabase/client";

export interface GerenciamentoLoja {
  id: string;
  empresa: string;
  gestor: string;
  cliente: string;
  status: string;
  servico: string; // Nome da aba (IFOOD, w99FOOD, etc.)
  tier: string;
  dataInicial: string;
  estrategia: string;
  estado: string;
  nicho: string;
}

export interface GerenciamentoResult {
  lojas: GerenciamentoLoja[];
  ativas: GerenciamentoLoja[];
  sheetNames: string[];
  serviceTotals: Record<string, number>;
}

const INACTIVE_STATUSES = ["PAUSADO", "STANDBY", "INICIAL", ""];

// Only process these service sheets (others are auxiliary/internal)
const VALID_SERVICE_SHEETS = ["IFOOD", "99FOOD", "W99FOOD", "GOOGLE"];

/** Normalize sheet name to canonical service name */
function normalizeSheetName(name: string): string {
  const up = name.toUpperCase();
  if (up === "W99FOOD" || up === "99 FOOD") return "99FOOD";
  return up;
}

function str(val: unknown): string {
  if (val == null) return "";
  return String(val).trim();
}

function num(val: unknown): number | undefined {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  const text = str(val).replace(/\./g, "").replace(",", ".");
  if (!text) return undefined;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Find the header row - looks for rows containing GESTOR and an empresa-like column
 */
function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i];
    const joined = row.map(c => str(c).toUpperCase()).join("|");
    const hasGestor = joined.includes("GESTOR");
    const hasEmpresa = joined.includes("NOME DA EMPRESA") || joined.includes("EMPRESA") || joined.includes("NOME FANTASIA");
    if (hasGestor && hasEmpresa) {
      return i;
    }
  }
  return -1;
}

function extractSheetTotal(rows: unknown[][]): number | undefined {
  for (let r = 0; r < Math.min(rows.length, 5); r++) {
    const row = rows[r] ?? [];
    for (let c = 0; c < row.length; c++) {
      if (str(row[c]).toUpperCase() !== "TOTAL") continue;
      const total = num(rows[r + 1]?.[c]);
      if (total !== undefined) return total;
    }
  }
  return undefined;
}

function parseSheet(rows: unknown[][], servico: string): GerenciamentoLoja[] {
  if (!rows || rows.length < 2) return [];

  const headerIdx = findHeaderRow(rows);
  if (headerIdx === -1) return [];

  const header = rows[headerIdx].map(c => str(c).toUpperCase());

  // Map columns by name
  const colMap: Record<string, number> = {};
  const colNames = ["TIER", "ID", "GESTOR", "INICIAL", "ESTRATÉGIA", "ESTRATEGIA", "NOME DA EMPRESA", "NOME FANTASIA", "CLIENTE", "STATUS", "ESTADO", "UF", "NICHO", "SEGMENTO"];

  for (let c = 0; c < header.length; c++) {
    for (const name of colNames) {
      if (header[c].includes(name)) {
        const key = name === "ESTRATÉGIA" ? "ESTRATEGIA"
          : (name === "NOME DA EMPRESA" || name === "NOME FANTASIA") ? "EMPRESA"
          : name === "UF" ? "ESTADO"
          : name === "SEGMENTO" ? "NICHO"
          : name;
        if (!(key in colMap)) colMap[key] = c;
      }
    }
  }

  const empresaIdx = colMap["EMPRESA"] ?? -1;
  const gestorIdx = colMap["GESTOR"] ?? -1;
  const statusIdx = colMap["STATUS"] ?? -1;
  const idIdx = colMap["ID"] ?? -1;
  const clienteIdx = colMap["CLIENTE"] ?? -1;
  const tierIdx = colMap["TIER"] ?? -1;
  const inicialIdx = colMap["INICIAL"] ?? -1;
  const estrategiaIdx = colMap["ESTRATEGIA"] ?? -1;
  const estadoIdx = colMap["ESTADO"] ?? -1;
  const nichoIdx = colMap["NICHO"] ?? -1;

  if (empresaIdx === -1) return [];

  const lojas: GerenciamentoLoja[] = [];

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const empresa = str(row[empresaIdx]);
    if (!empresa) continue;

    lojas.push({
      id: idIdx >= 0 ? str(row[idIdx]) : "",
      empresa,
      gestor: gestorIdx >= 0 ? str(row[gestorIdx]) : "",
      cliente: clienteIdx >= 0 ? str(row[clienteIdx]) : "",
      status: statusIdx >= 0 ? str(row[statusIdx]) : "",
      servico,
      tier: tierIdx >= 0 ? str(row[tierIdx]) : "",
      dataInicial: inicialIdx >= 0 ? str(row[inicialIdx]) : "",
      estrategia: estrategiaIdx >= 0 ? str(row[estrategiaIdx]) : "",
      estado: estadoIdx >= 0 ? str(row[estadoIdx]).toUpperCase() : "",
      nicho: nichoIdx >= 0 ? str(row[nichoIdx]) : "",
    });
  }

  return lojas;
}

export async function fetchGerenciamentoData(): Promise<GerenciamentoResult> {
  try {
    const { data, error } = await supabase.functions.invoke("gerenciamento-proxy");
    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    const sheetNames: string[] = data._sheetNames?.[0] || [];
    const lojas: GerenciamentoLoja[] = [];
    const serviceTotals: Record<string, number> = {};

    for (const [sheetName, rows] of Object.entries(data)) {
      if (sheetName === "_sheetNames") continue;
      const upperName = sheetName.toUpperCase();
      if (!VALID_SERVICE_SHEETS.includes(upperName)) continue;

      const canonicalName = normalizeSheetName(sheetName);
      const sheetRows = rows as unknown[][];
      const parsed = parseSheet(sheetRows, canonicalName);
      const summaryTotal = extractSheetTotal(sheetRows);

      lojas.push(...parsed);
      if (summaryTotal !== undefined) {
        serviceTotals[canonicalName] = summaryTotal;
      }
    }

    const ativas = lojas.filter(l => {
      const s = l.status.toUpperCase();
      return !INACTIVE_STATUSES.includes(s);
    });

    return { lojas, ativas, sheetNames, serviceTotals };
  } catch (err) {
    console.error("Erro ao buscar dados de Gerenciamento:", err);
    return { lojas: [], ativas: [], sheetNames: [], serviceTotals: {} };
  }
}
