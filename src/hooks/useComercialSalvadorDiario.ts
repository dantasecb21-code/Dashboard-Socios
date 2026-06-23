import { useQuery } from "@tanstack/react-query";
import { fetchComercialSalvadorDiario, ComercialSalvadorDiarioResult } from "@/services/comercialSalvadorDiarioService";
import { readPersistedQuery, writePersistedQuery } from "@/lib/queryPersistence";

const CACHE_KEY = "query-cache:comercial-salvador-diario:v1";

export function useComercialSalvadorDiario() {
  const cached = readPersistedQuery<ComercialSalvadorDiarioResult>(CACHE_KEY);
  return useQuery<ComercialSalvadorDiarioResult>({
    queryKey: ["comercial-salvador-diario", "v1"],
    queryFn: async () => {
      const data = await fetchComercialSalvadorDiario();
      writePersistedQuery(CACHE_KEY, data);
      return data;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnMount: cached ? false : "always",
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.updatedAt,
    retry: 1,
  });
}
