import { useQuery } from '@tanstack/react-query';
import { getPosts } from './postAPI';

export const usePostsQuery = () => {
  const { data: posts = [], isLoading, error } = useQuery({
    queryKey: ['explore-posts'],
    queryFn: async () => {
      try {
        const response = await getPosts();
        console.log('Fetched posts in usePostsQuery:', response);
        return response; 
      } catch (err) {
        console.error('Failed to fetch posts:', err);
        throw err;
      }
    },
  });

  return { posts, isLoading, error };
};