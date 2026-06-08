import { useQuery } from "@tanstack/react-query";
import { fetchEstrategiasData, EstrategiasResult } from "@/services/estrategiasService";
import { readPersistedQuery, writePersistedQuery } from "@/lib/queryPersistence";

const CACHE_KEY = "query-cache:estrategias-sheets:v2";

export function useEstrategias() {
  const cached = readPersistedQuery<EstrategiasResult>(CACHE_KEY);

  return useQuery<EstrategiasResult>({
    queryKey: ["estrategias-sheets", "v2"],
    queryFn: async () => {
      const data = await fetchEstrategiasData();
      if (data.estrategias.length > 0 || data.summary.total > 0) {
        writePersistedQuery(CACHE_KEY, data);
      }
      return data;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    refetchOnMount: "always",
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.updatedAt,
    retry: 1,
  });
}
