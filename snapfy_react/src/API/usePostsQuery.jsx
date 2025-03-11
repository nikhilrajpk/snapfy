import { useQuery } from '@tanstack/react-query';
import { getPosts } from './postAPI';

export const usePostsQuery = () => {
  const { data: posts = [], isLoading, error } = useQuery({
    queryKey: ['explore-posts'],
    queryFn: async () => {
      try {
        const response = await getPosts(true); // explore=true to exclude archived posts
        // console.log('Fetched posts in usePostsQuery:', response);
        return response;
      } catch (err) {
        console.error('Failed to fetch posts:', err);
        throw err;
      }
    },
    // Optional: Configure refetch behavior
    refetchOnWindowFocus: false, // Avoid unnecessary refetches
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return { posts, isLoading, error };
};