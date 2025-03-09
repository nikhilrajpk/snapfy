import React, { Suspense, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { usePostsQuery } from '../../API/usePostsQuery';
import { CLOUDINARY_ENDPOINT } from '../../APIEndPoints';
import Loader from '../../utils/Loader/Loader';

const Navbar = React.lazy(() => import('../../Components/Navbar/Navbar'));
const Stories = React.lazy(() => import('../../Components/Stories/Stories'));
const Post = React.lazy(() => import('../../Components/Post/Post'));
const Suggestions = React.lazy(() => import('../../Components/Suggestions/Suggestions'));
const Logo = React.lazy(() => import('../../Components/Logo/Logo'));

function Home() {
  const { posts, isLoading, error } = usePostsQuery();
  const containerRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: posts.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 600, // Adjust based on average post height (e.g., 600px)
    overscan: 5, // Load 5 items above/below viewport
  });

  useEffect(() => {
    virtualizer.measure();
  }, [posts.length, virtualizer]); // Re-measure when post count changes

  const normalizeUrl = (url) => {
    return url.replace(/^(auto\/upload\/)+/, '');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-amber-50 to-orange-50">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4 bg-gradient-to-br from-amber-50 to-orange-50">
        Failed to load posts: {error.message}. Please try again later.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar (Logo and Navbar) */}
          <div className="lg:col-span-2">
            <div className="sticky top-6">
              <Suspense fallback={<Loader />}>
                <Logo />
              </Suspense>
              <Suspense fallback={<Loader />}>
                <Navbar />
              </Suspense>
            </div>
          </div>

          {/* Main Scrollable Content */}
          <div className="lg:col-span-10">
            <div
              ref={containerRef}
              className="overflow-y-auto"
              style={{ height: 'calc(100vh - 48px)' }} // Adjust 48px for padding/margins
            >
              <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
                {/* Stories and Posts */}
                <div className="lg:col-span-7 space-y-6">
                  <Suspense fallback={<Loader />}>
                    <Stories />
                  </Suspense>
                  <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
                    {virtualizer.getVirtualItems().map((virtualItem) => {
                      const p = posts[virtualItem.index];
                      return (
                        <div
                          key={virtualItem.key}
                          className="absolute top-0 left-0 w-full"
                          style={{
                            transform: `translateY(${virtualItem.start}px)`,
                            height: `${virtualItem.size}px`,
                          }}
                        >
                          <Suspense fallback={<Loader />}>
                            <Post
                              id={p?.id}
                              username={p?.user?.username}
                              profileImage={
                                p?.user?.profile_picture
                                  ? `${p.user.profile_picture}`
                                  : '/default-profile.png'
                              }
                              image={normalizeUrl(p?.file)}
                              likes={p?.likes || 0}
                              caption={p?.caption}
                              hashtags={p?.hashtags?.map((tag) => tag.name) || []}
                              mentions={p?.mentions?.map((m) => m.username) || []}
                              commentCount={p?.comment_count || 0}
                            />
                          </Suspense>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Suggestions */}
                <div className="lg:col-span-3 space-y-6">
                  <h2 className="text-gray-700 font-semibold text-lg mb-3">SUGGESTED FOR YOU</h2>
                  <Suspense fallback={<Loader />}>
                    <Suggestions />
                  </Suspense>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;