/**
 * =====================================================
 * Google Apps Script — Comercial SP DIÁRIO (PROTEGIDO)
 * Planilha: Controle Diário (abas com datas: "11/05/2026", etc.)
 * Cabeçalho na linha 1.
 * Cor da linha (coluna STATUS) define o status:
 *   VERDE   → FEITO
 *   AMARELO → SEM RESPOSTA
 *   MARROM  → REAGENDAMENTO
 *   BRANCO  → A FAZER
 * =====================================================
 *
 * INSTRUÇÕES:
 * 1. Planilha DIÁRIA → Extensões → Apps Script
 * 2. Apague tudo e cole o código abaixo (sem /*...*\/)
 * 3. SUBSTITUA "COLE_O_TOKEN_AQUI" por um UUID novo
 * 4. Salve → Implantar → Nova implantação → App da Web
 *    Executar como: Eu | Acesso: Qualquer pessoa
 * 5. Copie URL + token e me passe
 *
 * =====================================================

const TOKEN = "COLE_O_TOKEN_AQUI";

const COLUNAS_ESPERADAS = [
  "DATA DO AGENDAMENTO",
  "AGENDER",
  "PROPRIETARIO",
  "NOME DA LOJA",
  "DATA DA REUNIÃO",
  "HORARIO",
  "TELEFONE",
  "LINK",
  "OBS",
  "STATUS",
  "CLOSER",
  "Assunto"
];

function doGet(e) {
  var providedToken = e && e.parameter ? e.parameter.token : null;
  if (providedToken !== TOKEN) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: "Unauthorized" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var abas = [];

  sheets.forEach(function (sheet) {
    var nome = sheet.getName();
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 1 || lastCol < 1) return;

    var headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var headerStr = headerRow.map(function (c) { return String(c || "").trim().toUpperCase(); });

    // Mapeia cada coluna esperada para o índice (0-based) na planilha
    var idx = {};
    COLUNAS_ESPERADAS.forEach(function (col) {
      var key = col.toUpperCase();
      var found = headerStr.indexOf(key);
      idx[col] = found;
    });

    var rows = [];
    if (lastRow >= 2) {
      var dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol);
      var values = dataRange.getValues();
      var displays = dataRange.getDisplayValues();
      var bgs = dataRange.getBackgrounds();

      var statusIdx = idx["STATUS"];

      for (var r = 0; r < values.length; r++) {
        var row = values[r];
        var disp = displays[r];
        // pega cor da coluna STATUS; se não existir, usa primeira não-branca da linha
        var color = "";
        if (statusIdx >= 0) {
          color = bgs[r][statusIdx] || "";
        }
        if (!color || color === "#ffffff") {
          // fallback: procura primeira cor não-branca/não-vazia na linha
          for (var c = 0; c < bgs[r].length; c++) {
            var bg = bgs[r][c];
            if (bg && bg !== "#ffffff" && bg !== "#000000") { color = bg; break; }
          }
        }

        var record = { _color: color, _status: classify(color), _row: r + 2 };
        COLUNAS_ESPERADAS.forEach(function (col) {
          var i = idx[col];
          if (i >= 0) {
            var v = values[r][i];
            if (v instanceof Date) v = v.toISOString();
            record[col] = v;
            record[col + "__display"] = disp[i];
          } else {
            record[col] = null;
            record[col + "__display"] = "";
          }
        });

        // ignora linhas totalmente vazias
        var algumPreenchido = COLUNAS_ESPERADAS.some(function (col) {
          var v = record[col];
          return v !== null && v !== undefined && String(v).trim() !== "";
        });
        if (algumPreenchido) rows.push(record);
      }
    }

    abas.push({ aba: nome, rows: rows });
  });

  return ContentService
    .createTextOutput(JSON.stringify({ abas: abas }))
    .setMimeType(ContentService.MimeType.JSON);
}

// classifica cor em status
function classify(hex) {
  if (!hex) return "A_FAZER";
  var h = String(hex).toLowerCase().replace("#", "");
  if (h.length !== 6) return "A_FAZER";
  var r = parseInt(h.substring(0, 2), 16);
  var g = parseInt(h.substring(2, 4), 16);
  var b = parseInt(h.substring(4, 6), 16);

  // branco / quase branco
  if (r > 240 && g > 240 && b > 240) return "A_FAZER";

  // amarelo (R alto, G alto, B baixo)
  if (r > 200 && g > 180 && b < 160 && Math.abs(r - g) < 80) return "SEM_RESPOSTA";

  // verde (G dominante)
  if (g > r && g > b) return "FEITO";
  // verde claro tipo #b6d7a8: r ~ 182, g ~ 215, b ~ 168
  if (g > 180 && r < g && b < g) return "FEITO";

  // marrom / laranja escuro (R dominante moderado, G médio-baixo, B baixo)
  if (r > 100 && r >= g && b < 120 && r - b > 30) return "REAGENDAMENTO";

  return "A_FAZER";
}

*/
