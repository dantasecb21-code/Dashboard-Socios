import { useQuery } from "@tanstack/react-query";
import { fetchGerenciamentoData, GerenciamentoResult } from "@/services/gerenciamentoService";
import { readPersistedQuery, writePersistedQuery } from "@/lib/queryPersistence";

const GERENCIAMENTO_CACHE_KEY = "query-cache:gerenciamento-sheets-v2";

export function useGerenciamento() {
  const cached = readPersistedQuery<GerenciamentoResult>(GERENCIAMENTO_CACHE_KEY);

  return useQuery<GerenciamentoResult>({
    queryKey: ["gerenciamento-sheets", "v2"],
    queryFn: async () => {
      const data = await fetchGerenciamentoData();
      writePersistedQuery(GERENCIAMENTO_CACHE_KEY, data);
      return data;
    },
    staleTime: 0,
    refetchInterval: 10 * 60 * 1000,
    refetchOnMount: "always",
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.updatedAt,
    retry: 1,
  });
}
