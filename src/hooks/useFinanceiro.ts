import { useQuery } from "@tanstack/react-query";
import { fetchFinanceiroData, FinanceiroResult } from "@/services/financeiroService";
import { readPersistedQuery, writePersistedQuery } from "@/lib/queryPersistence";

const FINANCEIRO_CACHE_KEY = "query-cache:financeiro-sheets";

export function useFinanceiro() {
  const cached = readPersistedQuery<FinanceiroResult>(FINANCEIRO_CACHE_KEY);

  return useQuery<FinanceiroResult>({
    queryKey: ["financeiro-sheets"],
    queryFn: async () => {
      const data = await fetchFinanceiroData();
      writePersistedQuery(FINANCEIRO_CACHE_KEY, data);
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
