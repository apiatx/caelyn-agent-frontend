import { useQuery } from "@tanstack/react-query";
import type { PortfolioValueHistory } from "@shared/schema";

export function usePortfolioValueHistory(portfolioId: number, limit: number = 100) {
  return useQuery<PortfolioValueHistory[]>({
    queryKey: ['/api/portfolio', portfolioId, 'value-history', limit],
    queryFn: async () => {
      const response = await fetch(`/api/portfolio/${portfolioId}/value-history?limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch portfolio value history');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });
}