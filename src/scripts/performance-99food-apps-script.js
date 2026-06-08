/**
 * Google Apps Script — PREVISIBILIDADE DE LOJAS 99FOOD
 *
 * Mapeamento OFICIAL:
 * Linha 3 = cabeçalho
 * Dados a partir da linha 4
 *
 * A  ID
 * B  NOME DA LOJA
 * C  FIDELIDADE
 * D  GARANTIA
 * E  GARANTIA ATINGIDA SIM/NÃO
 * F  DATA DE QUANDO ATINGIU
 * G  LTV
 * H  DATA DA ULTIMA ESTRATEGIA
 * I  DATA DE OTIMIZAÇÃO
 * J  DATA DE ENTREGA DA ESTRATEGIA
 * K  GESTOR
 * L  ESTRATEGISTA
 * M  COMUNICAÇÃO COM CLIENTE
 * N  DATA DE ENTRADA
 * O  FATURAMENTO INICIAL LIQUIDO
 * P  FATURAMENTO LIQ. MES ANTERIOR
 * Q  FATURAMENTO LIQUIDO ATUAL
 * R  TEMPO ABERTO ULT 30 DIAS
 * S  FATURAMENTO LIQUIDO 01 A 15
 * T  STATUS LOJA
 * U  STATUS (%)
 * V  ULT ATUALIZAÇÃO / OBSERVAÇÃO
 * W  OBSERVAÇÃO EXTRA
 * X  HISTÓRICO
 * Y  ESTADO
 * Z  NICHO
 * AB PREVISIBILIDADE
 */

const FOOD99_PREV_TOKEN = "COLE_AQUI_O_NOVO_TOKEN";
const FOOD99_PREV_VERSION = "99food-previsibilidade-2026-05-19";

const FOOD99_PREV_IGNORED = [
  "Resumo",
  "Config",
  "Base",
  "Geral",
  "Consolidado",
  "Dashboard"
];

const FOOD99_PREV_COLS = {
  id: 1,
  loja: 2,
  fidelidade: 3,
  garantia: 4,
  garantiaAtingida: 5,
  dataQuandoAtingiu: 6,
  ltv: 7,
  dataUltEstrategia: 8,
  dataOtimizacao: 9,
  dataEntregaEstr: 10,
  gestor: 11,
  estrategista: 12,
  comunicacao: 13,
  dataEntrada: 14,
  fatInicial: 15,
  fatMesAnterior: 16,
  fatAtual: 17,
  tempoAberto: 18,
  fatUlt15: 19,
  statusLoja: 20,
  statusPct: 21,
  ultAtualizacao: 22,
  observacao: 23,
  historico: 24,
  estado: 25,
  nicho: 26,
  previsibilidade: 28
};

const FOOD99_PREV_LAST_COL = 28;
const FOOD99_PREV_FIRST_ROW = 4;

function doGet(e) {
  const providedToken = e && e.parameter ? e.parameter.token : null;

  if (providedToken !== FOOD99_PREV_TOKEN) {
    return jsonOutFood99Prev({ error: "Unauthorized" });
  }

  const debugMode = e && e.parameter && e.parameter.debug === "1";

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();

    if (debugMode) {
      return jsonOutFood99Prev({
        version: FOOD99_PREV_VERSION,
        debug: collectDebugFood99Prev(sheets)
      });
    }

    const allRows = [];

    for (var s = 0; s < sheets.length; s++) {
      var sheet = sheets[s];
      var name = sheet.getName().trim();

      if (FOOD99_PREV_IGNORED.indexOf(name) >= 0) continue;
      if (name.toLowerCase().indexOf("resumo") >= 0) continue;

      var lastRow = sheet.getLastRow();
      if (lastRow < FOOD99_PREV_FIRST_ROW) continue;

      var values = sheet
        .getRange(
          FOOD99_PREV_FIRST_ROW,
          1,
          lastRow - (FOOD99_PREV_FIRST_ROW - 1),
          FOOD99_PREV_LAST_COL
        )
        .getValues();

      for (var i = 0; i < values.length; i++) {
        var r = values[i];
        var loja = String(r[FOOD99_PREV_COLS.loja - 1] || "").trim();
        if (!loja) continue;

        var lojaUp = loja.toUpperCase();
        if (
          lojaUp === "TOTAL" ||
          lojaUp === "RESUMO" ||
          lojaUp.indexOf("SUBTOTAL") >= 0
        ) {
          continue;
        }

        var statusPctRaw = String(r[FOOD99_PREV_COLS.statusPct - 1] || "").trim();
        var parsedStatus = parseStatusPctFood99Prev(statusPctRaw);

        var gestorCol = String(r[FOOD99_PREV_COLS.gestor - 1] || "").trim();
        var gestor = gestorCol || name;

        allRows.push({
          id: String(r[FOOD99_PREV_COLS.id - 1] || "").trim(),
          loja: loja,
          fidelidade: String(r[FOOD99_PREV_COLS.fidelidade - 1] || "").trim(),
          garantia: String(r[FOOD99_PREV_COLS.garantia - 1] || "").trim(),
          garantiaAtingida: String(r[FOOD99_PREV_COLS.garantiaAtingida - 1] || "").trim(),
          dataQuandoAtingiu: formatDateFood99Prev(r[FOOD99_PREV_COLS.dataQuandoAtingiu - 1]),
          ltv: formatLtvFood99Prev(r[FOOD99_PREV_COLS.ltv - 1]),
          dataUltEstrategia: formatDateFood99Prev(r[FOOD99_PREV_COLS.dataUltEstrategia - 1]),
          dataOtimizacao: formatDateFood99Prev(r[FOOD99_PREV_COLS.dataOtimizacao - 1]),
          dataEntrega: formatDateFood99Prev(r[FOOD99_PREV_COLS.dataEntregaEstr - 1]),
          gestor: gestor,
          gestorAba: name,
          estrategista: String(r[FOOD99_PREV_COLS.estrategista - 1] || "").trim(),
          comunicacao: String(r[FOOD99_PREV_COLS.comunicacao - 1] || "").trim(),
          dataEntrada: formatDateFood99Prev(r[FOOD99_PREV_COLS.dataEntrada - 1]),
          fatInicial: parseNumFood99Prev(r[FOOD99_PREV_COLS.fatInicial - 1]),
          fatMesAnterior: parseNumFood99Prev(r[FOOD99_PREV_COLS.fatMesAnterior - 1]),
          fatAtual: parseNumFood99Prev(r[FOOD99_PREV_COLS.fatAtual - 1]),
          tempoAberto: String(r[FOOD99_PREV_COLS.tempoAberto - 1] || "").trim(),
          fatUlt15: parseNumFood99Prev(r[FOOD99_PREV_COLS.fatUlt15 - 1]),
          statusLoja: normalizeStatusLojaFood99Prev(String(r[FOOD99_PREV_COLS.statusLoja - 1] || "")),
          status: parsedStatus.status,
          variacaoPct: parsedStatus.pct,
          statusRaw: statusPctRaw,
          ultAtualizacao: formatDateFood99Prev(r[FOOD99_PREV_COLS.ultAtualizacao - 1]),
          observacao: String(r[FOOD99_PREV_COLS.observacao - 1] || "").trim(),
          historico: String(r[FOOD99_PREV_COLS.historico - 1] || "").trim(),
          estado: String(r[FOOD99_PREV_COLS.estado - 1] || "").trim().toUpperCase(),
          nicho: String(r[FOOD99_PREV_COLS.nicho - 1] || "").trim(),
          previsibilidade: String(r[FOOD99_PREV_COLS.previsibilidade - 1] || "").trim(),
          plataforma: "99Food"
        });
      }
    }

    return jsonOutFood99Prev({
      version: FOOD99_PREV_VERSION,
      rows: allRows,
      summary: computeSummaryFood99Prev(allRows),
      generatedAt: new Date().toISOString()
    });

  } catch (err) {
    return jsonOutFood99Prev({
      error: String(err),
      stack: err.stack
    });
  }
}

function collectDebugFood99Prev(sheets) {
  var out = [];

  for (var i = 0; i < sheets.length; i++) {
    var sh = sheets[i];
    var name = sh.getName().trim();

    if (FOOD99_PREV_IGNORED.indexOf(name) >= 0) continue;
    if (name.toLowerCase().indexOf("resumo") >= 0) continue;

    var lastRow = sh.getLastRow();
    if (lastRow < 1) continue;

    var headerRows = sh
      .getRange(1, 1, Math.min(3, lastRow), FOOD99_PREV_LAST_COL)
      .getValues();

    var firstDataRow =
      lastRow >= FOOD99_PREV_FIRST_ROW
        ? sh.getRange(FOOD99_PREV_FIRST_ROW, 1, 1, FOOD99_PREV_LAST_COL).getValues()[0]
        : null;

    out.push({
      aba: name,
      header1: headerRows[0] || [],
      header2: headerRows[1] || [],
      header3: headerRows[2] || [],
      firstDataRow: firstDataRow
    });

    if (out.length >= 2) break;
  }

  return out;
}

function jsonOutFood99Prev(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function parseStatusPctFood99Prev(s) {
  var txt = String(s).trim();

  if (!txt) {
    return { status: "Indefinido", pct: null };
  }

  var up = txt.toUpperCase();
  var status = "Indefinido";

  if (up.indexOf("NOVA") >= 0) {
    status = "Nova";
  } else if (up.indexOf("CRESC") >= 0 || up.indexOf("AUMENT") >= 0) {
    status = "Crescimento";
  } else if (up.indexOf("QUEDA") >= 0 || up.indexOf("CAINDO") >= 0) {
    status = "Queda";
  } else if (up.indexOf("ESTÁV") >= 0 || up.indexOf("ESTAV") >= 0) {
    status = "Estável";
  }

  var match = txt.match(/-?\d+([.,]\d+)?/);
  var pct = match ? parseFloat(match[0].replace(",", ".")) : null;

  return { status: status, pct: pct };
}

function normalizeStatusLojaFood99Prev(s) {
  var up = String(s).toUpperCase().trim();
  if (up.indexOf("CANCEL") >= 0) return "Em cancelamento";
  if (up.indexOf("ATIV") >= 0) return "Ativa";
  return s ? String(s).trim() : "";
}

function parseNumFood99Prev(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;

  var s = String(v)
    .replace(/R\$/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  var n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function formatDateFood99Prev(v) {
  if (!v) return null;
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(v).trim();
}

function formatLtvFood99Prev(v) {
  if (v === null || v === undefined || v === "") return "";
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(v).trim();
}

function computeSummaryFood99Prev(rows) {
  var sum = {
    total: rows.length,
    crescimento: 0,
    estavel: 0,
    queda: 0,
    nova: 0,
    ativas: 0,
    emCancelamento: 0,
    porPlataforma: {},
    porGestor: {},
    porEstrategista: {},
    porEstado: {},
    porNicho: {},
    previsibilidade: {
      comPrevisibilidade: 0,
      semPrevisibilidade: 0
    }
  };

  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];

    if (r.status === "Crescimento") sum.crescimento++;
    else if (r.status === "Estável") sum.estavel++;
    else if (r.status === "Queda") sum.queda++;
    else if (r.status === "Nova") sum.nova++;

    if (r.statusLoja === "Ativa") sum.ativas++;
    else if (r.statusLoja === "Em cancelamento") sum.emCancelamento++;

    if (r.previsibilidade) sum.previsibilidade.comPrevisibilidade++;
    else sum.previsibilidade.semPrevisibilidade++;

    if (r.plataforma) {
      sum.porPlataforma[r.plataforma] = (sum.porPlataforma[r.plataforma] || 0) + 1;
    }

    if (r.estado) {
      sum.porEstado[r.estado] = (sum.porEstado[r.estado] || 0) + 1;
    }

    if (r.nicho) {
      sum.porNicho[r.nicho] = (sum.porNicho[r.nicho] || 0) + 1;
    }

    if (r.gestor) {
      if (!sum.porGestor[r.gestor]) {
        sum.porGestor[r.gestor] = { crescimento: 0, estavel: 0, queda: 0, nova: 0, total: 0 };
      }
      sum.porGestor[r.gestor].total++;
      if (r.status === "Crescimento") sum.porGestor[r.gestor].crescimento++;
      else if (r.status === "Estável") sum.porGestor[r.gestor].estavel++;
      else if (r.status === "Queda") sum.porGestor[r.gestor].queda++;
      else if (r.status === "Nova") sum.porGestor[r.gestor].nova++;
    }

    if (r.estrategista) {
      if (!sum.porEstrategista[r.estrategista]) {
        sum.porEstrategista[r.estrategista] = { crescimento: 0, estavel: 0, queda: 0, nova: 0, total: 0 };
      }
      sum.porEstrategista[r.estrategista].total++;
      if (r.status === "Crescimento") sum.porEstrategista[r.estrategista].crescimento++;
      else if (r.status === "Estável") sum.porEstrategista[r.estrategista].estavel++;
      else if (r.status === "Queda") sum.porEstrategista[r.estrategista].queda++;
      else if (r.status === "Nova") sum.porEstrategista[r.estrategista].nova++;
    }
  }

  return sum;
}
