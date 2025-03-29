// stories query
import { useQuery, useQueryClient} from '@tanstack/react-query';
import { getStories } from './authAPI';


export const useStoriesQuery = ({ page = 1, pageSize = 10 } = {}) => {
    const queryClient = useQueryClient();
  
    const { data, isLoading, error } = useQuery({
      queryKey: ['stories', page, pageSize], // Include page and pageSize in queryKey for unique caching
      queryFn: async () => {
        try {
          const response = await getStories({ page, pageSize });
          console.log('Fetched stories:', response); // Debug log
          return response; // Expecting { count, next, previous, results }
        } catch (err) {
          console.error('Failed to fetch stories:', err);
          throw err;
        }
      },
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  
    const invalidateStories = () => {
      queryClient.invalidateQueries(['stories']);
    };
  
    return { 
      stories: data?.results || [], // Extract results array
      totalCount: data?.count || 0, // Total number of stories
      next: data?.next, // URL for next page
      previous: data?.previous, // URL for previous page
      isLoading, 
      error, 
      invalidateStories 
    };
  };