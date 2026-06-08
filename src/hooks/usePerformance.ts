import { useQuery } from "@tanstack/react-query";
import { fetchPerformanceData, PerformanceResult } from "@/services/performanceService";
import { readPersistedQuery, writePersistedQuery } from "@/lib/queryPersistence";

const CACHE_KEY = "query-cache:performance-sheets:v5";

// Limpa caches antigos de versões anteriores que não tinham o campo `ltv`
if (typeof window !== "undefined") {
  try {
    window.localStorage.removeItem("query-cache:performance-sheets");
    window.localStorage.removeItem("query-cache:performance-sheets:v2");
    window.localStorage.removeItem("query-cache:performance-sheets:v3");
  } catch {
    // ignore
  }
}

export function usePerformance() {
  const cached = readPersistedQuery<PerformanceResult>(CACHE_KEY);

  return useQuery<PerformanceResult>({
    queryKey: ["performance-sheets-v5"],
    queryFn: async () => {
      const data = await fetchPerformanceData();
      writePersistedQuery(CACHE_KEY, data);
      return data;
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnMount: "always",
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.updatedAt,
    retry: 1,
  });
}
