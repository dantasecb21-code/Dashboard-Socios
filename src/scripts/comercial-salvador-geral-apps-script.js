/**
 * =====================================================
 * Google Apps Script — Comercial Salvador GERAL (PROTEGIDO)
 * Planilha: Dash Orgânico (Salvador)
 * Abas: REUNIÕES, BASE, QUANTIDADE DE VENDAS ANUAL,
 *       RECEITA ANUAL, RECEITA POR PRODUTO, PAGTO POR CANAL
 * =====================================================
 *
 * INSTRUÇÕES:
 * 1. Abra a planilha GERAL → Extensões → Apps Script
 * 2. Apague tudo e cole o código abaixo (sem o comentário /*...*\/)
 * 3. SUBSTITUA "COLE_O_TOKEN_AQUI" por um UUID novo
 * 4. Salve → Implantar → Nova implantação → Tipo: App da Web
 *    Executar como: Eu | Acesso: Qualquer pessoa
 * 5. Copie a URL e me passe ela + o token
 *    (env vars: COMERCIAL_SALVADOR_GERAL_APPS_SCRIPT_URL e COMERCIAL_SALVADOR_GERAL_APPS_SCRIPT_TOKEN)
 *
 * =====================================================

const TOKEN = "COLE_O_TOKEN_AQUI";

const ABAS = [
  "REUNIÕES",
  "BASE",
  "QUANTIDADE DE VENDAS ANUAL",
  "RECEITA ANUAL",
  "RECEITA POR PRODUTO",
  "PAGTO POR CANAL"
];

function doGet(e) {
  var providedToken = e && e.parameter ? e.parameter.token : null;
  if (providedToken !== TOKEN) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: "Unauthorized" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var output = {};

  ABAS.forEach(function (nome) {
    var sheet = ss.getSheetByName(nome);
    if (!sheet) {
      output[nome] = { values: [], displayValues: [] };
      return;
    }
    var range = sheet.getDataRange();
    output[nome] = {
      values: serialize(range.getValues()),
      displayValues: range.getDisplayValues()
    };
  });

  return ContentService
    .createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

function serialize(rows) {
  return rows.map(function (row) {
    return row.map(function (cell) {
      if (cell instanceof Date) return cell.toISOString();
      return cell;
    });
  });
}

*/
