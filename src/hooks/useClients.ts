import { useQuery } from "@tanstack/react-query";
import { fetchAllClients } from "@/services/sheetsService";
import { Client } from "@/data/clients";
import { clients as staticClients } from "@/data/clients";
import { readPersistedQuery, writePersistedQuery } from "@/lib/queryPersistence";

const CLIENTS_CACHE_KEY = "query-cache:clients-sheets-live-v2";

export function useClients() {
  const cached = readPersistedQuery<Client[]>(CLIENTS_CACHE_KEY);

  return useQuery<Client[]>({
    queryKey: ["clients-sheets-live-v2"],
    queryFn: async () => {
      const data = await fetchAllClients();
      writePersistedQuery(CLIENTS_CACHE_KEY, data);
      return data;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    refetchOnMount: cached ? false : "always",
    retry: 1,
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.updatedAt,
    placeholderData: (previousData) => previousData ?? staticClients,
  });
}
