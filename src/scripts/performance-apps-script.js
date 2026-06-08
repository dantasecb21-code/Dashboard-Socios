/**
 * Google Apps Script — PERFORMANCE DE LOJAS iFood
 *
 * Mapeamento OFICIAL da planilha (linha 3 = cabeçalho, dados a partir da linha 4):
 *
 *   A(1)  ID
 *   B(2)  NOME DA LOJA
 *   C(3)  FIDELIDADE
 *   D(4)  GARANTIA
 *   E(5)  GARANTIA ATINGIDA SIM/NÃO
 *   F(6)  DATA DE QUANDO ATINGIU
 *   G(7)  LTV
 *   H(8)  DATA DA ULTIMA ESTRATEGIA
 *   I(9)  DATA DE OTIMIZAÇÃO
 *   J(10) DATA DE ENTREGA DA ESTRATEGIA
 *   K(11) GESTOR
 *   L(12) ESTRATEGISTA
 *   M(13) Comunicação com cliente
 *   N(14) DATA DE ENTRADA
 *   O(15) FATURAMENTO INICIAL LIQUIDO
 *   P(16) FATURAMENTO LIQ. MES ANTERIOR
 *   Q(17) FATURAMENTO LIQUIDO ATUAL
 *   R(18) TEMPO ABERTO ULT 30 DIAS
 *   S(19) faturamento liquido 01 a 15
 *   T(20) STATUS LOJA
 *   U(21) STATUS (%)
 *   V(22) ULT ATUALIZAÇÃO DA PLANILHA / OBSERVAÇÃO DA LOJA
 *   W(23) (observação extra)
 *   X(24) Historico
 *   Y(25) ESTADO (Regional)
 *   Z(26) NICHO
 *
 * Para usar:
 * 1. Cole este código no editor do Apps Script (script.google.com).
 * 2. Salve (Ctrl+S).
 * 3. Implantar > Nova implantação > Tipo: App da Web > Executar como: Eu > Acesso: Qualquer pessoa.
 * 4. Copie a URL gerada e use no parâmetro APPS_SCRIPT_URL do edge function.
 */

const TOKEN = "a7f3c9e1-4b2d-4e8a-9f1c-6d5b8e3a2f47";
const SCRIPT_VERSION = "mapping-official-2026-05-01";

const IGNORED_SHEETS = ["Resumo", "Config", "Base", "Geral", "Consolidado", "Dashboard"];

// 1-based column numbers
const COLS = {
  id: 1,                  // A
  loja: 2,                // B
  fidelidade: 3,          // C
  garantia: 4,            // D
  garantiaAtingida: 5,    // E
  dataQuandoAtingiu: 6,   // F
  ltv: 7,                 // G
  dataUltEstrategia: 8,   // H
  dataOtimizacao: 9,      // I
  dataEntregaEstr: 10,    // J
  gestor: 11,             // K
  estrategista: 12,       // L
  comunicacao: 13,        // M
  dataEntrada: 14,        // N
  fatInicial: 15,         // O
  fatMesAnterior: 16,     // P
  fatAtual: 17,           // Q
  tempoAberto: 18,        // R
  fatUlt15: 19,           // S
  statusLoja: 20,         // T
  statusPct: 21,          // U
  ultAtualizacao: 22,     // V
  observacao: 23,         // W
  historico: 24,          // X
  estado: 25,             // Y
  nicho: 26,              // Z
  fatPrev15: 28,          // AB — faturamento líquido dos primeiros 15 dias (previsibilidade) OU texto da classificação
  prevClass: 28,          // AB — mesma coluna; tratada como texto quando contiver a classificação
};

const LAST_COL = 28;
const FIRST_DATA_ROW = 4;

function doGet(e) {
  const providedToken = e && e.parameter ? e.parameter.token : null;
  if (providedToken !== TOKEN) {
    return jsonOut({ error: "Unauthorized" });
  }

  const debugMode = e && e.parameter && e.parameter.debug === "1";

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();

    if (debugMode) {
      return jsonOut({ version: SCRIPT_VERSION, debug: collectDebug(sheets) });
    }

    const allRows = [];

    for (var s = 0; s < sheets.length; s++) {
      var sheet = sheets[s];
      var name = sheet.getName().trim();
      if (IGNORED_SHEETS.indexOf(name) >= 0) continue;
      if (name.toLowerCase().indexOf("resumo") >= 0) continue;

      var lastRow = sheet.getLastRow();
      if (lastRow < FIRST_DATA_ROW) continue;

      var values = sheet.getRange(FIRST_DATA_ROW, 1, lastRow - (FIRST_DATA_ROW - 1), LAST_COL).getValues();

      for (var i = 0; i < values.length; i++) {
        var r = values[i];
        var loja = String(r[COLS.loja - 1] || "").trim();
        if (!loja) continue;
        var lojaUp = loja.toUpperCase();
        if (lojaUp === "TOTAL" || lojaUp === "RESUMO" || lojaUp.indexOf("SUBTOTAL") >= 0) continue;

        var statusPctRaw = String(r[COLS.statusPct - 1] || "").trim();
        var parsedStatus = parseStatusPct(statusPctRaw);
        var gestorCol = String(r[COLS.gestor - 1] || "").trim();
        var gestor = gestorCol || name;

        allRows.push({
          id: String(r[COLS.id - 1] || "").trim(),
          loja: loja,
          fidelidade: String(r[COLS.fidelidade - 1] || "").trim(),
          garantia: String(r[COLS.garantia - 1] || "").trim(),
          garantiaAtingida: String(r[COLS.garantiaAtingida - 1] || "").trim(),
          dataQuandoAtingiu: formatDate(r[COLS.dataQuandoAtingiu - 1]),
          ltv: formatLtv(r[COLS.ltv - 1]),
          dataUltEstrategia: formatDate(r[COLS.dataUltEstrategia - 1]),
          dataOtimizacao: formatDate(r[COLS.dataOtimizacao - 1]),
          dataEntrega: formatDate(r[COLS.dataEntregaEstr - 1]),
          gestor: gestor,
          gestorAba: name,
          estrategista: String(r[COLS.estrategista - 1] || "").trim(),
          comunicacao: String(r[COLS.comunicacao - 1] || "").trim(),
          dataEntrada: formatDate(r[COLS.dataEntrada - 1]),
          fatInicial: parseNum(r[COLS.fatInicial - 1]),
          fatMesAnterior: parseNum(r[COLS.fatMesAnterior - 1]),
          fatAtual: parseNum(r[COLS.fatAtual - 1]),
          tempoAberto: String(r[COLS.tempoAberto - 1] || "").trim(),
          fatUlt15: parseNum(r[COLS.fatUlt15 - 1]),
          fatPrev15: parseNum(r[COLS.fatPrev15 - 1]),
          prevClassRaw: String(r[COLS.prevClass - 1] || "").trim(),
          statusLoja: normalizeStatusLoja(String(r[COLS.statusLoja - 1] || "")),
          status: parsedStatus.status,
          variacaoPct: parsedStatus.pct,
          statusRaw: statusPctRaw,
          ultAtualizacao: formatDate(r[COLS.ultAtualizacao - 1]),
          observacao: String(r[COLS.observacao - 1] || "").trim(),
          historico: String(r[COLS.historico - 1] || "").trim(),
          estado: String(r[COLS.estado - 1] || "").trim().toUpperCase(),
          nicho: String(r[COLS.nicho - 1] || "").trim(),
          plataforma: "iFood",
        });
      }
    }

    return jsonOut({
      version: SCRIPT_VERSION,
      rows: allRows,
      summary: computeSummary(allRows),
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return jsonOut({ error: String(err), stack: err.stack });
  }
}

function collectDebug(sheets) {
  var out = [];
  for (var i = 0; i < sheets.length; i++) {
    var sh = sheets[i];
    var name = sh.getName().trim();
    if (IGNORED_SHEETS.indexOf(name) >= 0) continue;
    if (name.toLowerCase().indexOf("resumo") >= 0) continue;
    var lastRow = sh.getLastRow();
    if (lastRow < 1) continue;
    var headerRows = sh.getRange(1, 1, Math.min(3, lastRow), LAST_COL).getValues();
    var firstDataRow = lastRow >= FIRST_DATA_ROW ? sh.getRange(FIRST_DATA_ROW, 1, 1, LAST_COL).getValues()[0] : null;
    out.push({
      aba: name,
      header1: headerRows[0] || [],
      header2: headerRows[1] || [],
      header3: headerRows[2] || [],
      firstDataRow: firstDataRow,
    });
    if (out.length >= 2) break;
  }
  return out;
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function parseStatusPct(s) {
  var txt = String(s).trim();
  if (!txt) return { status: "Indefinido", pct: null };
  var up = txt.toUpperCase();
  var status = "Indefinido";
  if (up.indexOf("CRESC") >= 0 || up.indexOf("AUMENT") >= 0) status = "Crescimento";
  else if (up.indexOf("QUEDA") >= 0 || up.indexOf("CAINDO") >= 0) status = "Queda";
  else if (up.indexOf("ESTÁV") >= 0 || up.indexOf("ESTAV") >= 0) status = "Estável";
  var match = txt.match(/-?\d+([.,]\d+)?/);
  var pct = match ? parseFloat(match[0].replace(",", ".")) : null;
  return { status: status, pct: pct };
}

function normalizeStatusLoja(s) {
  var up = String(s).toUpperCase().trim();
  if (up.indexOf("CANCEL") >= 0) return "Em cancelamento";
  if (up.indexOf("ATIV") >= 0) return "Ativa";
  return s ? String(s).trim() : "";
}

function parseNum(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  var s = String(v).replace(/R\$/gi, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  var n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function formatDate(v) {
  if (!v) return null;
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
  return String(v).trim();
}

function formatLtv(v) {
  if (v === null || v === undefined || v === "") return "";
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
  return String(v).trim();
}

function computeSummary(rows) {
  var sum = {
    total: rows.length,
    crescimento: 0,
    estavel: 0,
    queda: 0,
    ativas: 0,
    emCancelamento: 0,
    porPlataforma: {},
    porGestor: {},
    porEstrategista: {},
  };
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (r.status === "Crescimento") sum.crescimento++;
    else if (r.status === "Estável") sum.estavel++;
    else if (r.status === "Queda") sum.queda++;
    if (r.statusLoja === "Ativa") sum.ativas++;
    else if (r.statusLoja === "Em cancelamento") sum.emCancelamento++;
    if (r.plataforma) sum.porPlataforma[r.plataforma] = (sum.porPlataforma[r.plataforma] || 0) + 1;
    if (r.gestor) {
      if (!sum.porGestor[r.gestor]) sum.porGestor[r.gestor] = { crescimento: 0, estavel: 0, queda: 0, total: 0 };
      sum.porGestor[r.gestor].total++;
      if (r.status === "Crescimento") sum.porGestor[r.gestor].crescimento++;
      else if (r.status === "Estável") sum.porGestor[r.gestor].estavel++;
      else if (r.status === "Queda") sum.porGestor[r.gestor].queda++;
    }
    if (r.estrategista) {
      if (!sum.porEstrategista[r.estrategista]) sum.porEstrategista[r.estrategista] = { crescimento: 0, estavel: 0, queda: 0, total: 0 };
      sum.porEstrategista[r.estrategista].total++;
      if (r.status === "Crescimento") sum.porEstrategista[r.estrategista].crescimento++;
      else if (r.status === "Estável") sum.porEstrategista[r.estrategista].estavel++;
      else if (r.status === "Queda") sum.porEstrategista[r.estrategista].queda++;
    }
  }
  return sum;
}
