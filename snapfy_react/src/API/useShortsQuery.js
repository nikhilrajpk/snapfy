// API/useShortsQuery.js
import { useQuery } from '@tanstack/react-query';
import { getShorts } from './postAPI';

export const useShortsQuery = () => {
  const { data: shorts = [], isLoading, error } = useQuery({
    queryKey: ['shorts'],
    queryFn: async () => {
      try {
        const response = await getShorts();
        // console.log('Fetched shorts in useShortsQuery:', response);
        return response;
      } catch (err) {
        console.error('Failed to fetch shorts:', err);
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return { shorts, isLoading, error };
};