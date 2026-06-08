/**
 * =====================================================
 * Google Apps Script — Gerenciamento de Contas (PROTEGIDO)
 * =====================================================
 *
 * INSTRUÇÕES:
 * 1. Abra a planilha → Extensões → Apps Script
 * 2. Apague tudo e cole o código abaixo (linhas após a barra de comentário)
 * 3. SUBSTITUA "COLE_O_TOKEN_AQUI" pelo UUID gerado para esta planilha
 * 4. Salve → Implantar → Gerenciar implantações → ✏️ → Nova versão → Implantar
 *    (mantém a MESMA URL)
 * 5. Teste:  <URL>?token=<SEU_TOKEN>   → JSON
 *
 * =====================================================
 * CÓDIGO (cole no editor do Apps Script):
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
  var output = {};
  var sheetNames = [];

  function processRows(rows) {
    return rows.map(function(row) {
      return row.map(function(cell) {
        if (cell instanceof Date) return cell.toISOString();
        return cell;
      });
    });
  }

  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    sheetNames.push(name);
    output[name] = processRows(sheets[i].getDataRange().getValues());
  }

  output._sheetNames = [sheetNames];

  return ContentService
    .createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}
*/
