/**
 * =====================================================
 * Google Apps Script — Comercial Salvador (PROTEGIDO)
 * Planilha: Controle Comercial Salvador
 * Aba principal: Agendamentos
 *
 * Colunas esperadas: id, data_agendamento, data_reuniao,
 *   horario, agender, closer, proprietario, nome_loja,
 *   telefone, status, produto, origem
 *
 * =====================================================
 *
 * INSTRUÇÕES:
 * 1. Abra a planilha → Extensões → Apps Script
 * 2. Apague tudo e cole o código abaixo (sem o comentário /*...*\/)
 * 3. SUBSTITUA "COLE_O_TOKEN_AQUI" por um UUID novo
 * 4. Salve → Implantar → Nova implantação → Tipo: App da Web
 *    Executar como: Eu | Acesso: Qualquer pessoa
 * 5. Copie a URL e o token
 *    (env vars: COMERCIAL_SALVADOR_APPS_SCRIPT_URL e COMERCIAL_SALVADOR_APPS_SCRIPT_TOKEN)
 *
 * =====================================================

const TOKEN = "COLE_O_TOKEN_AQUI";
const ABA_NOME = "Agendamentos"; // nome exato da aba na planilha

function doGet(e) {
  var providedToken = e && e.parameter ? e.parameter.token : null;
  if (providedToken !== TOKEN) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: "Unauthorized" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(ABA_NOME);

  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ rows: [], error: "Aba '" + ABA_NOME + "' não encontrada" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow < 2 || lastCol < 1) {
    return ContentService
      .createTextOutput(JSON.stringify({ rows: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
    return String(h || "").trim().toLowerCase().replace(/\s+/g, "_");
  });

  var dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol);
  var values = dataRange.getValues();

  var rows = [];
  for (var r = 0; r < values.length; r++) {
    var row = values[r];
    var hasData = row.some(function(cell) {
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

  return ContentService
    .createTextOutput(JSON.stringify({ rows: rows }))
    .setMimeType(ContentService.MimeType.JSON);
}

*/
