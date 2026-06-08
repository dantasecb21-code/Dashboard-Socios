import { Client } from "@/data/clients";
import { clients as staticClients } from "@/data/clients";

// Google Apps Script Web App URL - user needs to deploy and paste the URL here
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzovnxDhonXy_0hxfxX6m1QJQzLaeEGSkyBtaicjv9G18bmx1AL1b9Ey98a3WsgMpZu/exec";

function parseNumber(val: string | number | null | undefined): number {
  if (val == null || val === "" || val === "-" || val === "N/A") return 0;
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;

  const clean = val.replace(/R\$\s?/g, "").replace(/\./g, "").replace(",", ".").trim();
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}

function str(val: any): string {
  if (val == null) return "";
  return String(val).trim();
}

function parseClientFromRow(row: any[]): Client | null {
  if (!row || row.length < 3) return null;
  const empresa = str(row[1]);
  if (!empresa) return null;

  return {
    id: str(row[0]) || "-",
    empresa,
    situacao: str(row[2]),
    lojaSituacao: str(row[3]),
    dataEntrada: str(row[4]),
    fidelidade: str(row[5]),
    promessaContrato: str(row[6]),
    contrato: str(row[7]),
    valor: parseNumber(row[8]),
    formaPagamento: str(row[9]),
    estrategista: str(row[10]) || "-",
    gestor: str(row[11]) || "-",
    canalVenda: str(row[12]),
    closer: str(row[13]),
    agender: str(row[14]),
    cliente: str(row[15]),
    email: str(row[16]),
    telefone: str(row[17]),
    razaoSocial: str(row[18]),
    cnpj: str(row[19]),
    gestao: str(row[20]),
    faturamentoInicial: parseNumber(row[21]),
    faturamentoUltimoMes: parseNumber(row[24]),
  };
}

export async function fetchAllClients(): Promise<Client[]> {
  if (!APPS_SCRIPT_URL) {
    console.log("Apps Script URL não configurada. Usando dados estáticos.");
    return staticClients;
  }

  try {
    const url = `${APPS_SCRIPT_URL}${APPS_SCRIPT_URL.includes("?") ? "&" : "?"}t=${Date.now()}`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) throw new Error(`Erro: ${res.status}`);

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error("Resposta inválida do Apps Script");
    }

    const data = await res.json();

    const bancoRows: string[][] = data.banco || [];
    const ifoodGestores: Array<{empresa: string; gestor: string; status: string}> = data.ifoodGestores || [];
    const food99Gestores: Array<{empresa: string; gestor: string}> = data.food99Gestores || [];

    const ifoodGestorMap = new Map<string, string>();
    const ifoodPausedSet = new Set<string>();

    for (const item of ifoodGestores) {
      const key = item.empresa.toUpperCase().trim();
      const status = item.status?.toLowerCase() || "";
      if (status === "pausado" || status === "realocada" || status === "em cancelamento") {
        ifoodPausedSet.add(key);
      } else if (item.gestor && item.gestor !== "GESTOR") {
        ifoodGestorMap.set(key, item.gestor);
      }
    }

    const food99GestorMap = new Map<string, string>();
    for (const item of food99Gestores) {
      const key = item.empresa.toUpperCase().trim();
      if (item.gestor && item.gestor !== "GESTOR") {
        food99GestorMap.set(key, item.gestor);
      }
    }

    const clients: Client[] = [];
    for (let i = 1; i < bancoRows.length; i++) {
      const client = parseClientFromRow(bancoRows[i]);
      if (!client) continue;

      const empresaKey = client.empresa.toUpperCase();
      const gestao = client.gestao.toUpperCase();

      if (gestao === "IFOOD") {
        const gestorOverride = ifoodGestorMap.get(empresaKey);
        if (gestorOverride) {
          client.gestor = gestorOverride;
        } else if (ifoodPausedSet.has(empresaKey)) {
          continue;
        }
      } else if (gestao === "99FOOD") {
        const gestorOverride = food99GestorMap.get(empresaKey);
        client.gestor = gestorOverride || "-";
      }

      clients.push(client);
    }

    return clients;
  } catch (err) {
    console.error("Erro ao buscar dados da planilha:", err);
    return staticClients;
  }
}
