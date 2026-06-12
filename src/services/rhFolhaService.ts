import { supabase } from "@/integrations/supabase/client";

export type PagoStatus = "PAGO" | "NAO" | "";
export type Categoria = "FOLHA" | "VARIAVEL" | "SAIDA";

export interface FolhaItem {
  mes: string;             // nome da aba
  categoria: Categoria;    // FOLHA = custo fixo / VARIAVEL = contas / SAIDA = gastos dos sócios
  contato: string;
  nome: string;
  setor: string;
  valor: number;
  valorDisplay: string;
  confirmacao: string;
  pago: PagoStatus;
  pagoRaw: string;
  obs: string | null;
  obsByField: Record<string, string>;
  dias: number[];          // dia(s) do mês de pagamento (1..31), inferidos
  dataDisplay: string;
  rowKey: string;
}

export interface SaidaItem {
  aba: string;
  destinatario: string;
  valor: number;
  valorDisplay: string;
  data: string;
  dia: number | null;
  responsavel: string;
  metodo: string;
  observacao: string;
  rowKey: string;
}

export interface RhFolhaResult {
  items: FolhaItem[];
  meses: string[];
  saidas: SaidaItem[];
}

const toStr = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString();
  return String(v);
};

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

// Extrai dias do nome da aba.
// "DIA 06 E 16 DE MARÇO" -> [6, 16] (dias específicos)
// "FOLHA DE PAG 06 a 15" -> [6,7,8,...,15] (intervalo)
function extractDiasFromAba(aba: string): number[] {
  const dias = new Set<number>();
  const up = aba.toUpperCase();
  // intervalo "X a Y" / "X-Y" / "X até Y"
  const range = up.match(/\b(\d{1,2})\s*(?:A|AT[ÉE]|-|–|—)\s*(\d{1,2})\b/);
  if (range) {
    let a = parseInt(range[1], 10);
    let b = parseInt(range[2], 10);
    if (a > b) [a, b] = [b, a];
    for (let d = Math.max(1, a); d <= Math.min(31, b); d++) dias.add(d);
    return Array.from(dias).sort((x, y) => x - y);
  }
  // dias soltos (ex.: "DIA 06 E 16")
  const matches = up.match(/\b(\d{1,2})\b/g) || [];
  matches.forEach((m) => {
    const n = parseInt(m, 10);
    if (n >= 1 && n <= 31) dias.add(n);
  });
  return Array.from(dias).sort((a, b) => a - b);
}

// Formata dias para exibição compacta: [6,7,...,15] -> "06–15"; [6,16] -> "06, 16"
function formatDias(dias: number[]): string {
  if (dias.length === 0) return "—";
  const sorted = [...dias].sort((a, b) => a - b);
  const isRange = sorted.length > 2 && sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (isRange) return `${pad(sorted[0])}–${pad(sorted[sorted.length - 1])}`;
  return sorted.map(pad).join(", ");
}
export { formatDias };

const MES_MAP: Record<string, number> = {
  JANEIRO: 0, FEVEREIRO: 1, MARCO: 2, MARÇO: 2, ABRIL: 3, MAIO: 4, JUNHO: 5,
  JULHO: 6, AGOSTO: 7, SETEMBRO: 8, OUTUBRO: 9, NOVEMBRO: 10, DEZEMBRO: 11,
  JAN: 0, FEV: 1, MAR: 2, ABR: 3, MAI: 4, JUN: 5, JUL: 6, AGO: 7, SET: 8, OUT: 9, NOV: 10, DEZ: 11,
};

// Detecta o mês (0-11) a partir do nome da aba. Retorna null se não conseguir.
export function extractMesFromAba(aba: string): number | null {
  const up = aba.toUpperCase();
  for (const [nome, idx] of Object.entries(MES_MAP)) {
    if (new RegExp(`\\b${nome}\\b`).test(up)) return idx;
  }
  return null;
}

// Calcula atraso: retorna { atrasado, diasAtraso } para um item não pago cujo
// vencimento (mês da aba + último dia do array dias) já passou.
export function computeAtraso(
  item: { mes: string; dias: number[]; pago: PagoStatus },
  now: Date = new Date()
): { atrasado: boolean; diasAtraso: number; vencimento: Date | null } {
  if (item.pago === "PAGO") return { atrasado: false, diasAtraso: 0, vencimento: null };
  if (!item.dias || item.dias.length === 0) return { atrasado: false, diasAtraso: 0, vencimento: null };
  const mesIdx = extractMesFromAba(item.mes);
  if (mesIdx === null) return { atrasado: false, diasAtraso: 0, vencimento: null };

  const year = now.getFullYear();
  // Usa o último dia do conjunto como vencimento (folha "06 a 15" vence dia 15; "06 e 16" vence no último citado)
  const dia = Math.max(...item.dias);
  const venc = new Date(year, mesIdx, dia);
  // Se a aba está em mês futuro deste ano mas a diferença é grande (>6 meses), pode ser do ano anterior
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = today.getTime() - venc.getTime();
  const diasAtraso = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diasAtraso <= 0) return { atrasado: false, diasAtraso: 0, vencimento: venc };
  return { atrasado: true, diasAtraso, vencimento: venc };
}

// Extrai dia(s) de uma string de data (DD/MM, DD/MM/AAAA, ISO, "06 e 16", etc.)
function extractDiasFromData(s: string): number[] {
  if (!s) return [];
  const dias = new Set<number>();
  // ISO yyyy-mm-dd
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = parseInt(iso[3], 10);
    if (d >= 1 && d <= 31) dias.add(d);
  }
  // dd/mm
  const br = s.match(/\b(\d{1,2})\/\d{1,2}/g);
  if (br) br.forEach((m) => {
    const d = parseInt(m.split("/")[0], 10);
    if (d >= 1 && d <= 31) dias.add(d);
  });
  if (dias.size === 0) {
    // números soltos
    const nums = s.match(/\b(\d{1,2})\b/g) || [];
    nums.forEach((m) => {
      const n = parseInt(m, 10);
      if (n >= 1 && n <= 31) dias.add(n);
    });
  }
  return Array.from(dias).sort((a, b) => a - b);
}

function detectCategoria(aba: string): Categoria | null {
  const up = aba.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (up.includes("RESUMO")) return null;
  if (up.includes("SAIDA") || up.includes("SAIDAS")) return "SAIDA";
  if (up.startsWith("FOLHA") || up.includes("FOLHA DE PAG") || up.includes("DIA ")) return "FOLHA";
  return "VARIAVEL";
}

function findField(row: Record<string, unknown>, candidates: string[]): unknown {
  const keys = Object.keys(row);
  const normalized = new Map(keys.map((k) => [normalizeKey(k), k]));
  for (const c of candidates) {
    const direct = row[c];
    if (direct !== undefined && direct !== null && String(direct).trim() !== "") return direct;
    const actualKey = normalized.get(normalizeKey(c));
    if (actualKey && row[actualKey] !== undefined && row[actualKey] !== null && String(row[actualKey]).trim() !== "") return row[actualKey];
  }
  return "";
}

const normalizeKey = (key: string) => key.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "");

function getField(row: Record<string, unknown>, candidates: string[]): string {
  const displayCandidates = candidates.flatMap((c) => [c + "__display", c]);
  return toStr(findField(row, displayCandidates));
}

// Detecta a chave que contém o "nome" do registro varrendo as chaves do row.
function findNomeKey(row: Record<string, unknown>): string | null {
  const keys = Object.keys(row).filter((k) => !k.startsWith("_") && !k.endsWith("__display"));
  // prioridade exata
  const exact = ["NOME", "NOME DO COLABORADOR", "COLABORADOR", "CONTAS", "DESCRICAO", "DESCRIÇÃO"];
  for (const e of exact) if (keys.includes(e)) return e;
  // contém
  for (const k of keys) {
    const up = k.toUpperCase();
    if (up.includes("NOME") || up.includes("COLABORADOR") || up.startsWith("DIA ") || up === "CONTAS") return k;
  }
  return null;
}

async function callProxy(only?: "saidas"): Promise<Array<{ aba: string; rows: Record<string, unknown>[] }>> {
  const path = only ? `rh-folha-proxy?only=${only}` : "rh-folha-proxy";
  const { data, error } = await supabase.functions.invoke(path);
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data?.abas ?? [];
}

function parseAbas(abasRaw: Array<{ aba: string; rows: Record<string, unknown>[] }>): RhFolhaResult {
  {
    const items: FolhaItem[] = [];
    const saidas: SaidaItem[] = [];
    const mesesSet = new Set<string>();

    for (const a of abasRaw) {
      const categoria = detectCategoria(a.aba);
      if (!categoria) continue;

      // ---- Aba de SAÍDAS (gastos dos sócios) ----
      if (categoria === "SAIDA") {
        mesesSet.add(a.aba);
        for (const row of a.rows) {
          const destinatario = getField(row, ["DESTINATARIO", "DESTINATÁRIO", "BENEFICIARIO", "BENEFICIÁRIO", "DESCRICAO", "DESCRIÇÃO"]);
          const valor = toNumber(findField(row, ["VALOR", "TOTAL"]));
          const valorDisplay = getField(row, ["VALOR", "TOTAL"]);
          const responsavel = getField(row, ["RESPONSAVEL", "RESPONSÁVEL", "SOCIO", "SÓCIO"]);
          if (!destinatario && !responsavel && valor === 0) continue;
          if (destinatario && /\bTOTAL\b|\bSALDO\b/.test(destinatario.toUpperCase())) continue;

          const dataDisplay = getField(row, ["DATA", "DATA DE SAIDA", "DATA DE SAÍDA", "VENCIMENTO"]);
          const dias = extractDiasFromData(dataDisplay);
          const metodo = getField(row, ["METODO DE SAIDA", "MÉTODO DE SAÍDA", "FORMA DE PAGAMENTO", "METODO"]);
          const observacao = getField(row, ["OBSERVACAO", "OBSERVAÇÃO", "OBS"]);
          const rowKey = `${a.aba}-${toStr(row["_row"])}-${destinatario}`;

          saidas.push({
            aba: a.aba,
            destinatario,
            valor,
            valorDisplay,
            data: dataDisplay,
            dia: dias[0] ?? null,
            responsavel,
            metodo,
            observacao,
            rowKey,
          });
          items.push({
            mes: a.aba,
            categoria: "SAIDA",
            contato: "",
            nome: destinatario,
            setor: responsavel || "Sócios",
            valor,
            valorDisplay,
            confirmacao: metodo,
            pago: "PAGO",
            pagoRaw: "PAGO",
            obs: observacao || null,
            obsByField: {},
            dias,
            dataDisplay,
            rowKey,
          });
        }
        continue;
      }

      const diasAba = extractDiasFromAba(a.aba);

      for (const row of a.rows) {
        const obsByField = (row["_obs"] as Record<string, string>) || {};
        const obsParts: string[] = [];
        Object.entries(obsByField).forEach(([campo, texto]) => {
          if (texto && String(texto).trim()) obsParts.push(`[${campo}] ${texto}`);
        });
        const obs = obsParts.length > 0 ? obsParts.join("\n") : null;

        const nomeKey = findNomeKey(row);
        const nome = nomeKey ? toStr(row[nomeKey + "__display"] || row[nomeKey]) : "";
        const valor = toNumber(findField(row, ["VALOR", "VALOR PAGO", "TOTAL"]));
        const valorDisplay = toStr(row["VALOR__display"] || row["TOTAL__display"] || "");
        if (!nome && valor === 0) continue;

        const setorVal = toStr(findField(row, ["SETOR", "CATEGORIA", "TIPO"]));
        const checkText = `${nome} ${setorVal}`.toUpperCase().trim();
        const SUMMARY_PATTERNS = [
          /\bTOTAL\b/, /^SUBTOTAL/, /VALOR\s+A\s+PAGAR/, /VALOR\s+PAGO/, /\bSALDO\b/, /^SOMA\b/,
        ];
        if (SUMMARY_PATTERNS.some((re) => re.test(checkText))) continue;

        const dataDisplay = toStr(
          row["DATA DE PAGAMENTO__display"] || row["DATA DE PAGAMENTO"] ||
          row["DATA PAGAMENTO__display"] || row["DATA PAGAMENTO"] ||
          row["DATA DO PAGAMENTO__display"] || row["DATA DO PAGAMENTO"] ||
          row["DATA__display"] || row["DATA"] ||
          row["VENCIMENTO__display"] || row["VENCIMENTO"] || ""
        );
        const diasFromData = extractDiasFromData(dataDisplay);
        const dias = diasFromData.length > 0 ? diasFromData : diasAba;

        const pagoRaw = toStr(row["PAGO__display"] || row["PAGO"]).trim().toUpperCase();
        const pago: PagoStatus = pagoRaw.includes("PAG") || pagoRaw === "OK" || pagoRaw === "SIM" || pagoRaw === "X" || pagoRaw === "✓"
          ? "PAGO"
          : pagoRaw === "" ? "" : "NAO";

        mesesSet.add(a.aba);
        items.push({
          mes: a.aba,
          categoria,
          contato: toStr(row["CONTATO__display"] || row["CONTATO"]),
          nome,
          setor: toStr(findField(row, ["SETOR", "CATEGORIA", "TIPO"])),
          valor,
          valorDisplay,
          confirmacao: toStr(row["CONFIRMACAO__display"] || row["CONFIRMACAO"] || row["CONFIRMAÇÃO"]),
          pago,
          pagoRaw: toStr(row["PAGO__display"] || row["PAGO"]),
          obs,
          obsByField,
          dias,
          dataDisplay,
          rowKey: `${a.aba}-${toStr(row["_row"])}-${nome}`,
        });
      }
    }

    return { items, meses: Array.from(mesesSet), saidas };
  }
}

export async function fetchRhFolha(): Promise<RhFolhaResult> {
  try {
    const abasRaw = await callProxy();
    return parseAbas(abasRaw);
  } catch (err) {
    console.error("Erro RH Folha:", err);
    return { items: [], meses: [], saidas: [] };
  }
}

export async function fetchRhSaidasOnly(): Promise<RhFolhaResult> {
  try {
    const abasRaw = await callProxy("saidas");
    return parseAbas(abasRaw);
  } catch (err) {
    console.error("Erro RH Folha (saídas):", err);
    return { items: [], meses: [], saidas: [] };
  }
}

