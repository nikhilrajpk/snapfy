import React, { Suspense, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { usePostsQuery } from '../../API/usePostsQuery';
import { useDispatch } from 'react-redux';
import { showToast } from '../../redux/slices/toastSlice';
import { logout } from '../../redux/slices/userSlice';
import { useNavigate } from 'react-router-dom';
import Loader from '../../utils/Loader/Loader';
import { userLogout } from '../../API/authAPI';
import { useAuth } from '../../API/useAuth';

const Navbar = React.lazy(() => import('../../Components/Navbar/Navbar'));
const UserStories = React.lazy(() => import('../../Components/Stories/UserStories'));
const Post = React.lazy(() => import('../../Components/Post/Post'));
const Suggestions = React.lazy(() => import('../../Components/Suggestions/Suggestions'));
const Logo = React.lazy(() => import('../../Components/Logo/Logo'));

function Home() {
  const { posts, isLoading, error } = usePostsQuery(false);
  const containerRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const virtualizer = useVirtualizer({
    count: posts.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 700,
    overscan: 5,
  });

  useEffect(() => {
    virtualizer.measure();
  }, [posts.length, virtualizer]);

  useAuth();

  useEffect(() => {
    if (error) {
      if (error.response?.status === 401) {
        console.log('401 detected, waiting for token refresh');
        dispatch(showToast({ message: 'Session expired. Please log in again.', type: 'error' }));
        // Rely on axios interceptor instead of immediate logout
      } else {
        dispatch(showToast({ message: `Failed to load posts: ${error.message}`, type: 'error' }));
      }
    }
  }, [error, dispatch]);

  const normalizeUrl = (url) => {
    return url.replace(/^(auto\/upload\/)+/, '');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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
          <div className="lg:col-span-10">
            <div ref={containerRef} className="overflow-y-auto" style={{ height: 'calc(100vh - 48px)' }}>
              <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
                <div className="lg:col-span-7 space-y-6">
                  <Suspense fallback={<Loader />}>
                    <UserStories />
                  </Suspense>
                  {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                      <Loader />
                    </div>
                  ) : error ? (
                    <div className="text-center text-red-500 p-4">
                      Failed to load posts. Please try refreshing the page or log in again.
                    </div>
                  ) : (
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
                                created_at={p?.created_at}
                              />
                            </Suspense>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
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