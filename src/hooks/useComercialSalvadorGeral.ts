import { useQuery } from "@tanstack/react-query";
import { fetchComercialSalvadorGeral, ComercialSalvadorGeralResult } from "@/services/comercialSalvadorGeralService";
import { readPersistedQuery, writePersistedQuery } from "@/lib/queryPersistence";

const CACHE_KEY = "query-cache:comercial-salvador-geral:v1";

export function useComercialSalvadorGeral() {
  const cached = readPersistedQuery<ComercialSalvadorGeralResult>(CACHE_KEY);
  return useQuery<ComercialSalvadorGeralResult>({
    queryKey: ["comercial-salvador-geral", "v1"],
    queryFn: async () => {
      const data = await fetchComercialSalvadorGeral();
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
