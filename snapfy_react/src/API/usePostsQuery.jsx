import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPosts } from './postAPI';

export const usePostsQuery = (isExplore = false) => {
  const queryClient = useQueryClient();

  const { data: posts = [], isLoading, error } = useQuery({
    queryKey: [isExplore ? 'explore-posts' : 'home-posts'],
    queryFn: async () => {
      try {
        const response = await getPosts(isExplore);
        return response;
      } catch (err) {
        console.error('Failed to fetch posts:', err);
        throw err;
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const invalidatePosts = () => {
    queryClient.invalidateQueries([isExplore ? 'explore-posts' : 'home-posts']);
  };

  return { posts, isLoading, error, invalidatePosts };
};