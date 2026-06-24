var TOKEN = '27aa3305-f499-4288-88c2-a52a4d5d1ef3';

function doGet(e) {
  var token = e && e.parameter ? e.parameter.token : null;
  if (token !== TOKEN) {
    return ContentService
      .createTextOutput('{"error":"Unauthorized"}')
      .setMimeType(ContentService.MimeType.JSON);
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var abas = {};

  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    var nome = sheet.getName();
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    if (lastRow < 2 || lastCol < 1) {
      abas[nome] = [];
      continue;
    }

    var headerRange = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var headers = [];
    for (var h = 0; h < headerRange.length; h++) {
      headers.push(String(headerRange[h] || '').trim());
    }

    var dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    var rows = [];

    for (var r = 0; r < dataRange.length; r++) {
      var row = dataRange[r];
      var hasData = false;
      for (var i = 0; i < row.length; i++) {
        if (row[i] !== null && row[i] !== undefined && String(row[i]).trim() !== '') {
          hasData = true;
          break;
        }
      }
      if (!hasData) continue;

      var record = {};
      for (var c = 0; c < headers.length; c++) {
        var key = headers[c] ? headers[c] : 'col_' + c;
        var val = row[c];
        if (val instanceof Date) {
          record[key] = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        } else {
          record[key] = val;
        }
      }
      rows.push(record);
    }

    abas[nome] = rows;
  }

  var agendRows = abas['Agendamentos'] ? abas['Agendamentos'] : [];
  var resultado = {};
  resultado['rows'] = agendRows;
  resultado['abas'] = abas;
  return ContentService
    .createTextOutput(JSON.stringify(resultado))
    .setMimeType(ContentService.MimeType.JSON);
}
