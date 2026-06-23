/**
 * =====================================================
 * Google Apps Script — Comercial Salvador (PROTEGIDO)
 * Planilha: Controle Comercial Salvador
 *
 * Retorna TODAS as abas da planilha + mantém compatibilidade
 * com formato antigo { rows: [...] } para Agendamentos.
 *
 * Response: { rows: [...], abas: { "NomeAba": [...], ... } }
 * =====================================================
 *
 * INSTRUÇÕES:
 * 1. Abra a planilha → Extensões → Apps Script
 * 2. Apague tudo e cole o código abaixo (sem o comentário /*...*\/)
 * 3. SUBSTITUA "COLE_O_TOKEN_AQUI" pelo token atual
 * 4. Salve → Implantar → Nova implantação → Tipo: App da Web
 *    Executar como: Eu | Acesso: Qualquer pessoa
 * 5. Copie a URL gerada (atualize COMERCIAL_SALVADOR_APPS_SCRIPT_URL)
 *
 * =====================================================

const TOKEN = "COLE_O_TOKEN_AQUI";

function doGet(e) {
  var providedToken = e && e.parameter ? e.parameter.token : null;
  if (providedToken !== TOKEN) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: "Unauthorized" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var abas = {};

  sheets.forEach(function (sheet) {
    var nome = sheet.getName();
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    if (lastRow < 2 || lastCol < 1) {
      abas[nome] = [];
      return;
    }

    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
      return String(h || "").trim();
    });

    var dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol);
    var values = dataRange.getValues();
    var rows = [];

    for (var r = 0; r < values.length; r++) {
      var row = values[r];
      var hasData = row.some(function (cell) {
        return cell !== null && cell !== undefined && String(cell).trim() !== "";
      });
      if (!hasData) continue;

      var record = {};
      for (var c = 0; c < headers.length; c++) {
        var key = headers[c] || ("col_" + c);
        var v = row[c];
        if (v instanceof Date) {
          record[key] = Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
        } else {
          record[key] = v;
        }
      }
      rows.push(record);
    }

    abas[nome] = rows;
  });

  // Compatibilidade com formato antigo: expõe Agendamentos como rows[]
  var agendRows = abas["Agendamentos"] || [];

  return ContentService
    .createTextOutput(JSON.stringify({ rows: agendRows, abas: abas }))
    .setMimeType(ContentService.MimeType.JSON);
}

*/
