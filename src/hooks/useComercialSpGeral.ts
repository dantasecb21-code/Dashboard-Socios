import { useQuery } from "@tanstack/react-query";
import { fetchComercialSpGeral, ComercialSpGeralResult } from "@/services/comercialSpGeralService";
import { readPersistedQuery, writePersistedQuery } from "@/lib/queryPersistence";

const CACHE_KEY = "query-cache:comercial-sp-geral:v3";

export function useComercialSpGeral() {
  const cached = readPersistedQuery<ComercialSpGeralResult>(CACHE_KEY);
  return useQuery<ComercialSpGeralResult>({
    queryKey: ["comercial-sp-geral", "v3"],
    queryFn: async () => {
      const data = await fetchComercialSpGeral();
      writePersistedQuery(CACHE_KEY, data);
      return data;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    refetchOnMount: cached ? false : "always",
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.updatedAt,
    retry: 1,
  });
}
