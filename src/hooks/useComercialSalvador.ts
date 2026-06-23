import { useQuery } from "@tanstack/react-query";
import { fetchComercialSalvador, ComercialSalvadorResult } from "@/services/comercialSalvadorService";
import { readPersistedQuery, writePersistedQuery } from "@/lib/queryPersistence";

const CACHE_KEY = "query-cache:comercial-salvador:v1";

export function useComercialSalvador() {
  const cached = readPersistedQuery<ComercialSalvadorResult>(CACHE_KEY);
  return useQuery<ComercialSalvadorResult>({
    queryKey: ["comercial-salvador", "v1"],
    queryFn: async () => {
      const data = await fetchComercialSalvador();
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
