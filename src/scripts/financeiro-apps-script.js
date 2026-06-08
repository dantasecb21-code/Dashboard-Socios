/**
 * =====================================================
 * Google Apps Script — Dashboard Financeiro (PROTEGIDO)
 * =====================================================
 *
 * INSTRUÇÕES:
 * 1. Abra a planilha → Extensões → Apps Script
 * 2. Apague tudo e cole o código abaixo (linhas após a barra de comentário)
 * 3. SUBSTITUA "COLE_O_TOKEN_AQUI" pelo UUID gerado para esta planilha
 * 4. Salve → Implantar → Gerenciar implantações → ✏️ → Nova versão → Implantar
 *    (mantém a MESMA URL)
 * 5. Teste:  <URL>?token=<SEU_TOKEN>   → deve retornar JSON
 *           <URL>                      → deve retornar "Unauthorized"
 *
 * =====================================================
 * CÓDIGO (cole no editor do Apps Script):
 * =====================================================

const TOKEN = "COLE_O_TOKEN_AQUI";

function doGet(e) {
  // Validação do token
  var providedToken = e && e.parameter ? e.parameter.token : null;
  if (providedToken !== TOKEN) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: "Unauthorized" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var spSheet = ss.getSheetByName("São Paulo - 2025");
  var spData = spSheet ? spSheet.getDataRange().getValues() : [];

  var ssaSheet = ss.getSheetByName("Salvador- 2025");
  var ssaData = ssaSheet ? ssaSheet.getDataRange().getValues() : [];

  function processRows(rows) {
    return rows.map(function(row) {
      return row.map(function(cell) {
        if (cell instanceof Date) return cell.toISOString();
        return cell;
      });
    });
  }

  var output = {
    sp: processRows(spData),
    ssa: processRows(ssaData)
  };

  return ContentService
    .createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}
*/
