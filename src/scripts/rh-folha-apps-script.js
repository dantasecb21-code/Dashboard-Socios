/**
 * =====================================================
 * Google Apps Script — RH FOLHA / Contas a Pagar (PROTEGIDO)
 * Planilha: "Contas a pagar"
 * Lê TODAS as abas genericamente. Suporta ?only=saidas pra retornar
 * SÓ a aba SAÍDAS rapidamente (sem Drive.Comments).
 * =====================================================
 *
 * INSTRUÇÕES:
 * 1. Planilha → Extensões → Apps Script
 * 2. Cole este código (mantenha seu TOKEN)
 * 3. ATIVE A DRIVE API: Serviços (+) → Drive API → v2 → Adicionar
 * 4. Salve → Implantar → Gerenciar implantações → editar → Nova versão
 *    Executar como: Eu | Acesso: Qualquer pessoa
 *
 * =====================================================
 */

const TOKEN = "COLE_O_TOKEN_AQUI";
const MAX_ROWS_PER_SHEET = 500;
const HEADER_SEARCH_RANGE = 10;
const HEADER_KEYWORDS = [
  "NOME", "VALOR", "PAGO", "CONTAS", "DATA", "SETOR",
  "PIX", "DESCONTO", "COMISSAO", "CONTATO", "COLABORADOR",
  "DESTINATARIO", "RESPONSAVEL", "METODO DE SAIDA", "OBSERVACAO"
];

function doGet(e) {
  var providedToken = e && e.parameter ? e.parameter.token : null;
  if (providedToken !== TOKEN) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Unauthorized" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var only = e && e.parameter ? (e.parameter.only || "") : "";
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var fileId = ss.getId();
  var sheets = ss.getSheets();

  // ---- Filtra abas se only=saidas ----
  if (only === "saidas") {
    sheets = sheets.filter(function (s) {
      var n = s.getName().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return n.indexOf("SAIDA") !== -1;
    });
  }

  // ---- Drive.Comments só na chamada completa ----
  var commentsBySheet = {};
  if (only !== "saidas") {
    try {
      var resp = Drive.Comments.list(fileId, {
        fields: "items(content,author/displayName,modifiedDate,anchor,deleted,replies(content,author/displayName,modifiedDate))",
        maxResults: 200
      });
      (resp.items || []).forEach(function (c) {
        if (c.deleted) return;
        var anchor = parseAnchor(c.anchor);
        if (!anchor) return;
        var addr = colLetter(anchor.startCol + 1) + (anchor.startRow + 1);
        var sid = String(anchor.sheetId);
        if (!commentsBySheet[sid]) commentsBySheet[sid] = {};
        var pieces = [fmt(c)];
        (c.replies || []).forEach(function (r) { pieces.push(fmt(r)); });
        var existing = commentsBySheet[sid][addr];
        commentsBySheet[sid][addr] = existing ? existing + "\n" + pieces.join("\n") : pieces.join("\n");
      });
    } catch (err) { /* segue só com notas */ }
  }

  var abas = [];

  sheets.forEach(function (sheet) {
    var nome = sheet.getName();
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 1 || lastCol < 1) {
      abas.push({ aba: nome, headers: [], rows: [], headerRow: -1 });
      return;
    }

    var headerRowIdx = -1;
    var headerVals = [];
    var maxSearch = Math.min(HEADER_SEARCH_RANGE, lastRow);
    for (var hr = 1; hr <= maxSearch; hr++) {
      var row = sheet.getRange(hr, 1, 1, lastCol).getValues()[0];
      var up = row.map(function (v) { return normalizeHeader(v); });
      var hits = 0;
      up.forEach(function (h) { if (h && HEADER_KEYWORDS.indexOf(h) !== -1) hits++; });
      if (hits >= 2) {
        headerRowIdx = hr;
        headerVals = up.map(function (h, i) {
          return h || ("COL_" + colLetter(i + 1));
        });
        break;
      }
    }

    if (headerRowIdx === -1) {
      abas.push({ aba: nome, headers: [], rows: [], headerRow: -1 });
      return;
    }

    var firstDataRow = headerRowIdx + 1;
    var dataRowCount = Math.min(lastRow - headerRowIdx, MAX_ROWS_PER_SHEET);
    var rows = [];

    if (dataRowCount > 0) {
      var range = sheet.getRange(firstDataRow, 1, dataRowCount, lastCol);
      var values = range.getValues();
      var displays = range.getDisplayValues();
      var bgs = only === "saidas" ? null : range.getBackgrounds();
      var notes = only === "saidas" ? null : range.getNotes();
      var sheetCommentMap = commentsBySheet[String(sheet.getSheetId())] || {};

      for (var r = 0; r < values.length; r++) {
        var absRow = firstDataRow + r;
        var record = { _row: absRow };
        var obsByField = {};
        var bgByField = {};
        var algumPreenchido = false;

        for (var c = 0; c < headerVals.length; c++) {
          var key = headerVals[c];
          var v = values[r][c];
          if (v instanceof Date) v = v.toISOString();
          var disp = displays[r][c];

          record[key] = v;
          record[key + "__display"] = disp;

          if (bgs) {
            var bg = bgs[r][c] || "";
            if (bg && bg !== "#ffffff") bgByField[key] = bg;
          }

          if (v !== null && v !== undefined && String(v).trim() !== "") {
            algumPreenchido = true;
          }

          if (notes) {
            var note = (notes[r][c] || "").trim();
            var addr = colLetter(c + 1) + absRow;
            var thread = sheetCommentMap[addr] || "";
            var combined = [note, thread].filter(function (s) { return s && s.trim(); }).join("\n");
            if (combined) obsByField[key] = combined;
          }
        }

        record._obs = obsByField;
        record._bg = bgByField;

        if (algumPreenchido) rows.push(record);
      }
    }

    abas.push({ aba: nome, headers: headerVals, headerRow: headerRowIdx, rows: rows });
  });

  return ContentService.createTextOutput(JSON.stringify({ abas: abas }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== Helpers =====
function normalizeHeader(v) {
  return String(v || "").trim().toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}
function colLetter(n) {
  var s = "";
  while (n > 0) { var rem = (n - 1) % 26; s = String.fromCharCode(65 + rem) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
function parseAnchor(a) {
  if (!a) return null;
  try {
    var o = typeof a === "string" ? JSON.parse(a) : a;
    if (!o || !o.range) return null;
    return { sheetId: o.range.sheetId || 0, startRow: o.range.startRowIndex, startCol: o.range.startColumnIndex };
  } catch (e) { return null; }
}
function fmt(c) {
  var who = (c.author && c.author.displayName) || "Comentário";
  var when = "";
  if (c.modifiedDate) {
    try {
      var d = new Date(c.modifiedDate);
      when = " (" + ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + ")";
    } catch (e) {}
  }
  return who + when + ": " + String(c.content || "").trim();
}
