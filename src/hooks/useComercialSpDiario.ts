import { useQuery } from "@tanstack/react-query";
import { fetchComercialSpDiario, ComercialSpDiarioResult } from "@/services/comercialSpDiarioService";
import { readPersistedQuery, writePersistedQuery } from "@/lib/queryPersistence";

const CACHE_KEY = "query-cache:comercial-sp-diario:v1";

export function useComercialSpDiario() {
  const cached = readPersistedQuery<ComercialSpDiarioResult>(CACHE_KEY);
  return useQuery<ComercialSpDiarioResult>({
    queryKey: ["comercial-sp-diario", "v1"],
    queryFn: async () => {
      const data = await fetchComercialSpDiario();
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
