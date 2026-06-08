import { useQuery } from "@tanstack/react-query";
import { fetchRhSaidasOnly, RhFolhaResult } from "@/services/rhFolhaService";
import { readPersistedQuery, writePersistedQuery } from "@/lib/queryPersistence";

const CACHE_KEY = "query-cache:rh-saidas:v1";

export function useRhSaidas() {
  const cached = readPersistedQuery<RhFolhaResult>(CACHE_KEY);
  return useQuery<RhFolhaResult>({
    queryKey: ["rh-saidas", "v1"],
    queryFn: async () => {
      const data = await fetchRhSaidasOnly();
      writePersistedQuery(CACHE_KEY, data);
      return data;
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnMount: cached ? false : "always",
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.updatedAt,
    retry: 1,
  });
}
