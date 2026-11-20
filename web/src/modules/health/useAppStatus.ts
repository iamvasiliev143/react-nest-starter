import { useQuery } from '@tanstack/react-query';
import { checkHealth } from './api';

export function useAppStatus() {
  return useQuery({
    queryKey: ['app-status'],
    queryFn: ({ signal }) => checkHealth(signal),
    refetchInterval: 5000,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    retry: false,
  });
}
