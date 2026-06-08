export interface FinanceiroClient {
  canal: string;
  id: string;
  empresa: string;
  cliente: string;
  situacao: string;
  valorFixo: number;
  gestao: string;
  closer: string;
  agender: string;
  telefone: string;
  razaoSocial: string;
  cnpj: string;
  estado: string;
  email: string;
  contrato: string;
  plano: string;
  fidelidade: string;
  entrada: string;
  ultimoPagamento: string;
  diasAtraso: number;
  qtdMeses: number;
  diaPagamento: number;
  valorAtrasado: number;
  atrasadoComJuros: number;
  valorVariavel: string;
  formaPagamento: string;
  regiao: "SP" | "SSA";
  pagamentosMensais: Record<string, number>;
}

const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrencyBR(value: number): string {
  return BRL_FORMATTER.format(value || 0);
}

export const ATRASO_STATUSES = ["ATRASADO", "ATRASO DO MÊS", "EM CANCELAMENTO/ATRASADO"];

export const EM_CANCELAMENTO_STATUSES = [
  "EM CANCELAMENTO",
  "EM CANCELAMENTO/ATRASADO",
  "EM CANCELAMENTO/PAGO",
];

/** Valor efetivo de atraso: prevalece juros quando > 0, senão valor normal. */
export function getValorAtrasoEfetivo(c: Pick<FinanceiroClient, "valorAtrasado" | "atrasadoComJuros">): number {
  return (c.atrasadoComJuros || 0) > 0 ? c.atrasadoComJuros : (c.valorAtrasado || 0);
}

/** Cliente realmente em atraso: status de atraso E algum valor > 0 (ignora "PAGO" marcados errado). */
export function isClienteEmAtraso(c: Pick<FinanceiroClient, "situacao" | "valorAtrasado" | "atrasadoComJuros">): boolean {
  const status = (c.situacao || "").toUpperCase();
  if (!ATRASO_STATUSES.includes(status)) return false;
  return (c.valorAtrasado || 0) > 0 || (c.atrasadoComJuros || 0) > 0;
}

export function isEmCancelamento(c: Pick<FinanceiroClient, "situacao">): boolean {
  return EM_CANCELAMENTO_STATUSES.includes((c.situacao || "").toUpperCase());
}

export function getMonthLabel(key: string): string {
  const [year, month] = key.split("-");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[parseInt(month) - 1]}/${year.slice(2)}`;
}

function parseNum(val: unknown): number {
  if (val === null || val === undefined || val === "" || val === "-" || val === "nan") return 0;
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;

  let s = String(val).replace(/R\$\s?/g, "").replace(/\s/g, "").trim();
  if (!s) return 0;

  if (s.includes(",") && s.includes(".")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    const parts = s.split(".");
    if (parts.length > 2) {
      s = `${parts.slice(0, -1).join("")}.${parts[parts.length - 1]}`;
    }
  }

  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function safeStr(val: unknown): string {
  if (val === null || val === undefined || String(val) === "nan" || String(val) === "NaT") return "";
  return String(val).trim();
}

function parseDateStr(val: unknown): string {
  if (!val || String(val) === "nan" || String(val) === "NaT") return "";
  const s = String(val);
  // Handle ISO date strings from spreadsheet
  if (s.includes("T") || s.match(/^\d{4}-\d{2}-\d{2}/)) {
    try {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("pt-BR");
      }
    } catch { /* fall through */ }
  }
  return s.trim();
}

export interface FinanceiroSummary {
  receitaMensal: number; // TOTAL DE CLIENTES ATIVOS
  receitaAtiva: number;  // PAGO ATUAL
  emCancelamento: number; // EM CANCELAMENTO
}

function parseRawNum(val: unknown): number {
  return parseNum(val);
}

function parseSummarySP(rows: unknown[][]): FinanceiroSummary {
  const summary: FinanceiroSummary = { receitaMensal: 0, receitaAtiva: 0, emCancelamento: 0 };
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i];
    if (!r || r.length < 7) continue;
    const label = safeStr(r[4]).toUpperCase().trim();
    const val = parseRawNum(r[6]);
    if (label === "TOTAL DE CLIENTES ATIVOS") summary.receitaMensal = val;
    else if (label.startsWith("PAGO ATUAL")) summary.receitaAtiva = val;
    else if (label === "EM CANCELAMENTO" || label === "EM CANCELAMENTO/ATRASADO" || label === "EM CANCELAMENTO/PAGO") summary.emCancelamento += val;
  }
  return summary;
}

function parseSummarySSA(rows: unknown[][]): FinanceiroSummary {
  const summary: FinanceiroSummary = { receitaMensal: 0, receitaAtiva: 0, emCancelamento: 0 };
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i];
    if (!r || r.length < 8) continue;
    const label = safeStr(r[5]).toUpperCase().trim();
    const val = parseRawNum(r[7]);
    if (label === "TOTAL DE CLIENTES ATIVOS") summary.receitaMensal = val;
    else if (label.startsWith("PAGO ATUAL")) summary.receitaAtiva = val;
    else if (label === "EM CANCELAMENTO" || label === "EM CANCELAMENTO/ATRASADO" || label === "EM CANCELAMENTO/PAGO") summary.emCancelamento += val;
  }
  return summary;
}

export function parseFinanceiroSummaries(spRows: unknown[][], ssaRows: unknown[][]): FinanceiroSummary {
  const sp = parseSummarySP(spRows);
  const ssa = parseSummarySSA(ssaRows);
  return {
    receitaMensal: sp.receitaMensal + ssa.receitaMensal,
    receitaAtiva: sp.receitaAtiva + ssa.receitaAtiva,
    emCancelamento: sp.emCancelamento + ssa.emCancelamento,
  };
}

export function parseFinanceiroSummariesByRegion(spRows: unknown[][], ssaRows: unknown[][]): { geral: FinanceiroSummary; sp: FinanceiroSummary; ssa: FinanceiroSummary } {
  const sp = parseSummarySP(spRows);
  const ssa = parseSummarySSA(ssaRows);
  return {
    sp,
    ssa,
    geral: {
      receitaMensal: sp.receitaMensal + ssa.receitaMensal,
      receitaAtiva: sp.receitaAtiva + ssa.receitaAtiva,
      emCancelamento: sp.emCancelamento + ssa.emCancelamento,
    },
  };
}

export function parseFinanceiroSP(rows: unknown[][]): FinanceiroClient[] {
  const clients: FinanceiroClient[] = [];
  const header = rows[0] as string[];

  // Find month columns (col 36+)
  const monthCols: { col: number; key: string }[] = [];
  for (let c = 36; c < header.length; c++) {
    const h = String(header[c]);
    // Extract YYYY-MM from date strings
    const match = h.match(/(\d{4})-(\d{2})/);
    if (match) {
      monthCols.push({ col: c, key: `${match[1]}-${match[2]}` });
    }
  }

  const validSituacoes = new Set(["PAGO", "INATIVO", "EM CANCELAMENTO", "EM CANCELAMENTO/ATRASADO", "EM CANCELAMENTO/PAGO", "ATRASO DO MÊS", "ATRASADO", "PENDÊNCIA", "CANCELADO", "PAUSADO", "ACORDO", "A PAGAR", "NÃO COBRAR", "SEM RESULTADO", "SINAL", "NOVO CLIENTE"]);

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 20) continue;

    const situacao = safeStr(r[1]).toUpperCase();
    if (!validSituacoes.has(situacao)) continue;

    const empresa = safeStr(r[6]);
    if (!empresa) continue;

    const pagamentos: Record<string, number> = {};
    for (const mc of monthCols) {
      const val = parseNum(r[mc.col]);
      if (val > 0) pagamentos[mc.key] = val;
    }

    // Determine forma de pagamento from BTG/PagBank columns
    const btg = safeStr(r[35]);
    const pagbank = safeStr(r[34]);
    let forma = "";
    if (btg && btg !== "nan") forma = btg;
    else if (pagbank && pagbank !== "nan") forma = pagbank;

    clients.push({
      canal: safeStr(r[3]),
      id: safeStr(r[0]) || "-",
      empresa,
      cliente: safeStr(r[7]),
      situacao,
      valorFixo: parseNum(r[2]),
      gestao: safeStr(r[20]) || "-",
      closer: safeStr(r[4]),
      agender: safeStr(r[5]),
      telefone: safeStr(r[8]),
      razaoSocial: safeStr(r[9]),
      cnpj: safeStr(r[10]),
      estado: safeStr(r[26]),
      email: safeStr(r[27]),
      contrato: safeStr(r[28]),
      plano: safeStr(r[22]),
      fidelidade: safeStr(r[23]),
      entrada: parseDateStr(r[13]),
      ultimoPagamento: parseDateStr(r[14]),
      diasAtraso: parseNum(r[15]),
      qtdMeses: parseNum(r[16]),
      diaPagamento: parseNum(r[17]),
      valorAtrasado: parseNum(r[18]),
      atrasadoComJuros: parseNum(r[19]),
      valorVariavel: safeStr(r[29]),
      formaPagamento: forma,
      regiao: "SP",
      pagamentosMensais: pagamentos,
    });
  }
  return clients;
}

export function parseFinanceiroSSA(rows: unknown[][]): FinanceiroClient[] {
  const clients: FinanceiroClient[] = [];
  const header = rows[0] as string[];

  const monthCols: { col: number; key: string }[] = [];
  for (let c = 36; c < header.length; c++) {
    const h = String(header[c]);
    const match = h.match(/(\d{4})-(\d{2})/);
    if (match) {
      monthCols.push({ col: c, key: `${match[1]}-${match[2]}` });
    }
  }

  const validSituacoes = new Set(["PAGO", "INATIVO", "EM CANCELAMENTO", "EM CANCELAMENTO/ATRASADO", "EM CANCELAMENTO/PAGO", "ATRASO DO MÊS", "ATRASADO", "PENDÊNCIA", "CANCELADO", "PAUSADO", "ACORDO", "A PAGAR", "NÃO COBRAR", "SEM RESULTADO", "SINAL", "NOVO CLIENTE"]);

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 20) continue;

    const situacao = safeStr(r[2]).toUpperCase();
    if (!validSituacoes.has(situacao)) continue;

    const empresa = safeStr(r[6]);
    if (!empresa) continue;

    const pagamentos: Record<string, number> = {};
    for (const mc of monthCols) {
      const val = parseNum(r[mc.col]);
      if (val > 0) pagamentos[mc.key] = val;
    }

    const btg = safeStr(r[34]);
    const pagbank = safeStr(r[35]);
    let forma = "";
    if (btg && btg !== "nan") forma = btg;
    else if (pagbank && pagbank !== "nan") forma = pagbank;

    clients.push({
      canal: "",
      id: safeStr(r[1]) || "-",
      empresa,
      cliente: safeStr(r[7]),
      situacao,
      valorFixo: parseNum(r[3]),
      gestao: safeStr(r[21]) || "-",
      closer: safeStr(r[4]),
      agender: safeStr(r[5]),
      telefone: safeStr(r[8]),
      razaoSocial: safeStr(r[10]),
      cnpj: safeStr(r[11]),
      estado: safeStr(r[27]),
      email: safeStr(r[28]),
      contrato: safeStr(r[29]),
      plano: safeStr(r[23]),
      fidelidade: safeStr(r[24]),
      entrada: parseDateStr(r[14]),
      ultimoPagamento: parseDateStr(r[15]),
      diasAtraso: parseNum(r[16]),
      qtdMeses: parseNum(r[17]),
      diaPagamento: parseNum(r[18]),
      valorAtrasado: parseNum(r[19]),
      atrasadoComJuros: parseNum(r[20]),
      valorVariavel: safeStr(r[30]),
      formaPagamento: forma,
      regiao: "SSA",
      pagamentosMensais: pagamentos,
    });
  }
  return clients;
}
