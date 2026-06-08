/**
 * =====================================================
 * Google Apps Script — Estratégias (PROTEGIDO)
 * =====================================================
 *
 * INSTRUÇÕES:
 * 1. Abra a planilha → Extensões → Apps Script
 * 2. No SEU código atual do doGet, ADICIONE no topo as linhas de
 *    validação de token mostradas abaixo (mantenha o resto da sua lógica).
 * 3. SUBSTITUA "COLE_O_TOKEN_AQUI" pelo UUID gerado para esta planilha.
 * 4. Salve → Implantar → Gerenciar implantações → ✏️ → Nova versão → Implantar
 *    (mantém a MESMA URL)
 * 5. Teste:  <URL>?token=<SEU_TOKEN>   → JSON
 *
 * =====================================================
 * TRECHO A ADICIONAR (cole no topo do doGet):
 * =====================================================

const TOKEN = "COLE_O_TOKEN_AQUI";

function doGet(e) {
  // ⬇️ ADICIONE ESTAS LINHAS NO TOPO DO doGet EXISTENTE
  var providedToken = e && e.parameter ? e.parameter.token : null;
  if (providedToken !== TOKEN) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: "Unauthorized" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ⬇️ MANTENHA TODA A SUA LÓGICA EXISTENTE DAQUI PRA BAIXO
  // (leitura da aba, montagem de rows, summary, etc.)
}
*/
