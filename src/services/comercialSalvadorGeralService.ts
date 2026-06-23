import { supabase } from "@/integrations/supabase/client";

// ===== TYPES =====
export type Cell = string | number | boolean | null;
export type Matrix = Cell[][];

export interface ReuniaoLinha {
  agender: string;
  agendamentos: number;
  reunioesFeitas: number;
  media: number | null;
  vendas: number;
  meta: number | null;
}

export interface BaseVenda {
  empresa: string;
  produto: string;
  cliente: string;
  data: string | null;
  mes: string;
  ano: number | null;
  formaPagto: string;
  quantidade: number;
  preco: number;
  total: number;
  closer: string;
}

export interface MesValor {
  mes: string;
  valor: number;
}

export interface ProdutoLinha {
  produto: string;
  quantidade: number;
  total: number;
}

export interface PagamentoLinha {
  metodo: string;
  quantidade: number;
  total: number;
}

export interface CloserLinha {
  closer: string;
  reunioes: number;
  vendas: number;
  media: number | null;
  meta: number | null;
}

export interface ComercialSalvadorGeralResult {
  reunioesAbril: ReuniaoLinha[];
  reunioesMaio: ReuniaoLinha[];
  closersMesVigente: CloserLinha[];
  closersTituloBloco: string | null;
  base: BaseVenda[];
  vendasAnual: MesValor[];
  receitaAnual: MesValor[];
  receitaPorProduto: ProdutoLinha[];
  pagtoPorCanal: PagamentoLinha[];
  metaMesVigente: number | null;
  totalVendasMesVigente: number;
  receitaMesVigente: number;
}

// ===== HELPERS =====
const toNumber = (v: Cell): number => {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[R$\s.]/g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};
const toStr = (v: Cell): string => (v === null || v === undefined ? "" : String(v).trim());

// ===== PARSERS =====
function parseReunioes(matrix: Matrix): { abril: ReuniaoLinha[]; maio: ReuniaoLinha[] } {
  const abril: ReuniaoLinha[] = [];
  const maio: ReuniaoLinha[] = [];
  if (!matrix || !matrix.length) return { abril, maio };

  // Layout: bloco esquerdo (Abril) começa na coluna C (idx 2); bloco direito (Maio) na coluna J (idx 9)
  function extractBlock(startCol: number): ReuniaoLinha[] {
    const out: ReuniaoLinha[] = [];
    let inSalvador = false;
    for (let r = 0; r < matrix.length; r++) {
      const row = matrix[r] || [];
      const c0 = toStr(row[startCol]);
      const c0norm = c0.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      if (c0norm === "salvador") { inSalvador = true; continue; }
      if (inSalvador && c0.toLowerCase() === "total") break;
      if (inSalvador && c0 && c0.toLowerCase() !== "agenders") {
        out.push({
          agender: c0,
          agendamentos: toNumber(row[startCol + 1]),
          reunioesFeitas: toNumber(row[startCol + 2]),
          media: row[startCol + 3] !== "" && row[startCol + 3] !== null ? toNumber(row[startCol + 3]) : null,
          vendas: toNumber(row[startCol + 4]),
          meta: row[startCol + 5] !== "" && row[startCol + 5] !== null ? toNumber(row[startCol + 5]) : null,
        });
      }
    }
    return out;
  }

  return { abril: extractBlock(2), maio: extractBlock(9) };
}

function parseBase(matrix: Matrix): BaseVenda[] {
  const out: BaseVenda[] = [];
  if (!matrix || matrix.length < 2) return out;
  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r] || [];
    const empresa = toStr(row[0]);
    if (!empresa) continue;
    out.push({
      empresa,
      produto: toStr(row[1]),
      cliente: toStr(row[2]),
      data: row[3] ? String(row[3]) : null,
      mes: toStr(row[4]),
      ano: row[5] ? toNumber(row[5]) : null,
      formaPagto: toStr(row[6]),
      quantidade: toNumber(row[7]),
      preco: toNumber(row[8]),
      total: toNumber(row[9]),
      closer: toStr(row[10]),
    });
  }
  return out;
}

const MES_MAP: Record<string, number> = {
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
};

function parseMesValor(matrix: Matrix): { rows: MesValor[]; mesVigente: number | null; metaMesVigente: number | null } {
  const out: MesValor[] = [];
  let metaMesVigente: number | null = null;
  if (!matrix || matrix.length < 2) return { rows: out, mesVigente: null, metaMesVigente: null };
  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r] || [];
    const mes = toStr(row[0]);
    if (!mes || mes.length > 4) continue;
    out.push({ mes, valor: toNumber(row[1]) });
    if (metaMesVigente === null) {
      const v = row[5] ?? row[4];
      if (v !== "" && v !== null && v !== undefined) {
        const n = toNumber(v);
        if (n) metaMesVigente = n;
      }
    }
  }

  const mesAtualIdx = new Date().getMonth();
  let mesVigente: number | null = null;
  const linhaAtual = out.find(
    (r) => MES_MAP[r.mes.slice(0, 3).toLowerCase()] === mesAtualIdx
  );
  if (linhaAtual && linhaAtual.valor > 0) {
    mesVigente = linhaAtual.valor;
  } else {
    const ultimo = [...out].reverse().find((r) => r.valor > 0);
    mesVigente = ultimo ? ultimo.valor : null;
  }

  return { rows: out, mesVigente, metaMesVigente };
}

function parseReceitaPorProduto(matrix: Matrix): ProdutoLinha[] {
  const out: ProdutoLinha[] = [];
  if (!matrix || matrix.length < 2) return out;
  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r] || [];
    const produto = toStr(row[0]);
    if (!produto || produto.toLowerCase() === "total") continue;
    out.push({ produto, quantidade: toNumber(row[1]), total: toNumber(row[2]) });
  }
  return out;
}

function parsePagtoPorCanal(matrix: Matrix): PagamentoLinha[] {
  const out: PagamentoLinha[] = [];
  if (!matrix || matrix.length < 2) return out;
  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r] || [];
    const metodo = toStr(row[0]);
    if (!metodo) continue;
    out.push({ metodo, quantidade: toNumber(row[1]), total: toNumber(row[2]) });
  }
  return out;
}

const MES_NOME_TO_IDX: Record<string, number> = {
  janeiro:0, fevereiro:1, marco:2, "março":2, abril:3, maio:4, junho:5,
  julho:6, agosto:7, setembro:8, outubro:9, novembro:10, dezembro:11,
};

function parseClosersMesVigente(matrix: Matrix): { rows: CloserLinha[]; titulo: string | null } {
  if (!matrix?.length) return { rows: [], titulo: null };

  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const now = new Date();
  const mesAtual = now.getMonth();
  const anoAtual = now.getFullYear();

  type Hit = { r: number; c: number; mes: number; ano: number; texto: string };
  const hits: Hit[] = [];
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r] || [];
    for (let c = 0; c < row.length; c++) {
      const txt = toStr(row[c]);
      if (!txt) continue;
      const n = norm(txt);
      if (!n.includes("relatorio de closer")) continue;
      const m = n.match(/relatorio de closer\s+([a-zç]+)\s*\/?\s*(\d{4})?/i);
      if (!m) continue;
      const mesNome = m[1];
      const mesIdx = MES_NOME_TO_IDX[mesNome] ?? -1;
      const ano = m[2] ? parseInt(m[2], 10) : anoAtual;
      if (mesIdx === -1) continue;
      hits.push({ r, c, mes: mesIdx, ano, texto: txt });
    }
  }

  if (!hits.length) return { rows: [], titulo: null };

  let chosen = hits.find(h => h.mes === mesAtual && h.ano === anoAtual);
  if (!chosen) {
    chosen = [...hits].sort((a, b) => (b.ano - a.ano) || (b.mes - a.mes))[0];
  }

  let headerRow = chosen.r + 1;
  let reunioesCol = chosen.c + 1;
  for (let r = chosen.r + 1; r <= Math.min(matrix.length - 1, chosen.r + 4); r++) {
    const row = matrix[r] || [];
    for (let c = Math.max(0, chosen.c - 1); c <= Math.min(row.length - 1, chosen.c + 5); c++) {
      if (norm(toStr(row[c])).includes("reuniao")) {
        headerRow = r;
        reunioesCol = c;
        break;
      }
    }
  }

  const header = matrix[headerRow] || [];
  const findHeaderCol = (term: string, fallback: number) => {
    for (let c = reunioesCol; c <= Math.min(header.length - 1, reunioesCol + 5); c++) {
      if (norm(toStr(header[c])).includes(term)) return c;
    }
    return fallback;
  };

  const startRow = headerRow + 1;
  const startCol = Math.max(0, reunioesCol - 1);
  const vendasCol = findHeaderCol("venda", reunioesCol + 1);
  const mediaCol = findHeaderCol("media", vendasCol + 1);
  const metaCol = findHeaderCol("meta", mediaCol + 1);
  const out: CloserLinha[] = [];
  let blankRows = 0;
  for (let r = startRow; r < matrix.length; r++) {
    const row = matrix[r] || [];
    const nome = toStr(row[startCol]);
    if (!nome) {
      blankRows += 1;
      if (blankRows >= 3) break;
      continue;
    }
    blankRows = 0;
    if (norm(nome).startsWith("total")) break;
    const reunioesRaw = toStr(row[reunioesCol]);
    const vendasRaw = toStr(row[vendasCol]);
    const mediaRaw = toStr(row[mediaCol]);
    const metaRaw = toStr(row[metaCol]);
    const isMediaSem = norm(mediaRaw).includes("sem media") || norm(mediaRaw).includes("sem médi");
    out.push({
      closer: nome,
      reunioes: toNumber(reunioesRaw),
      vendas: toNumber(vendasRaw),
      media: isMediaSem || !mediaRaw ? null : toNumber(mediaRaw),
      meta: metaRaw === "" ? null : toNumber(metaRaw),
    });
  }

  return { rows: out, titulo: chosen.texto };
}

// ===== FETCH =====
export async function fetchComercialSalvadorGeral(): Promise<ComercialSalvadorGeralResult> {
  const empty: ComercialSalvadorGeralResult = {
    reunioesAbril: [], reunioesMaio: [], closersMesVigente: [], closersTituloBloco: null, base: [],
    vendasAnual: [], receitaAnual: [], receitaPorProduto: [], pagtoPorCanal: [],
    metaMesVigente: null, totalVendasMesVigente: 0, receitaMesVigente: 0,
  };
  try {
    const { data, error } = await supabase.functions.invoke("comercial-salvador-geral-proxy");
    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    const get = (k: string): Matrix => (data?.[k]?.values ?? []) as Matrix;

    const reunioesMatrix = get("REUNIÕES");
    const reunioes = parseReunioes(reunioesMatrix);
    const closers = parseClosersMesVigente(reunioesMatrix);
    const base = parseBase(get("BASE"));
    const vendas = parseMesValor(get("QUANTIDADE DE VENDAS ANUAL"));
    const receita = parseMesValor(get("RECEITA ANUAL"));
    const produto = parseReceitaPorProduto(get("RECEITA POR PRODUTO"));
    const pagto = parsePagtoPorCanal(get("PAGTO POR CANAL"));

    return {
      reunioesAbril: reunioes.abril,
      reunioesMaio: reunioes.maio,
      closersMesVigente: closers.rows,
      closersTituloBloco: closers.titulo,
      base,
      vendasAnual: vendas.rows,
      receitaAnual: receita.rows,
      receitaPorProduto: produto,
      pagtoPorCanal: pagto,
      metaMesVigente: vendas.metaMesVigente,
      totalVendasMesVigente: vendas.mesVigente ?? 0,
      receitaMesVigente: receita.mesVigente ?? 0,
    };
  } catch (err) {
    console.error("Erro Comercial Salvador Geral:", err);
    return empty;
  }
}
