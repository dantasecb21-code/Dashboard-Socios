import { useQuery } from "@tanstack/react-query";
import { fetchRhFolha, RhFolhaResult } from "@/services/rhFolhaService";
import { readPersistedQuery, writePersistedQuery } from "@/lib/queryPersistence";

const CACHE_KEY = "query-cache:rh-folha:v2";

export function useRhFolha() {
  const cached = readPersistedQuery<RhFolhaResult>(CACHE_KEY);
  return useQuery<RhFolhaResult>({
    queryKey: ["rh-folha", "v2"],
    queryFn: async () => {
      const data = await fetchRhFolha();
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
