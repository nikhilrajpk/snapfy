import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { usePostsQuery } from '../../API/usePostsQuery';
import SideBar from '../../Components/Navbar/SideBar';
import PostPopup from '../../Components/Post/PostPopup';
import { useSelector } from 'react-redux';
import { CLOUDINARY_ENDPOINT } from '../../APIEndPoints';
import { useDispatch } from 'react-redux';
import { showToast } from '../../redux/slices/toastSlice';
import { logout } from '../../redux/slices/userSlice';
import { useNavigate } from 'react-router-dom';

const Card = ({ post, onClick }) => {
  const normalizeUrl = (url) => url.replace(/^(auto\/upload\/)+/, '');

  return (
    <div
      onClick={() => onClick(post)}
      className="aspect-square bg-white rounded-md shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition duration-200 group relative"
    >
      {post?.file.includes('/video/upload/') ? (
        <video
          src={normalizeUrl(post?.file)}
          className="w-full h-full object-cover transform group-hover:scale-105 transition duration-500"
          muted
          autoPlay={false}
          controls
        />
      ) : (
        <img
          src={normalizeUrl(post?.file)}
          alt={post?.caption}
          className="w-full h-full object-cover transform group-hover:scale-105 transition duration-500"
          loading="lazy"
        />
      )}
      <div className="absolute inset-0 bg-[#198754] bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <span className="text-white font-semibold">{post?.caption.slice(0, 20)}...</span>
      </div>
    </div>
  );
};

const ExplorePage = () => {
  const { posts = [], isLoading, error, invalidatePosts } = usePostsQuery(true); // Explore mode
  const { user } = useSelector((state) => state.user);
  const containerRef = useRef(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const virtualizer = useVirtualizer({
    count: posts.length ? Math.ceil(posts.length / 3) : 0,
    estimateSize: () => 300,
    getScrollElement: () => containerRef.current,
    overscan: 5,
  });

  useEffect(() => {
    virtualizer.measure();
  }, [posts, virtualizer]);

  useEffect(() => {
    if (error) {
      if (error.response?.status === 401) {
        dispatch(showToast({ message: 'Session expired. Please log in again.', type: 'error' }));
        // dispatch(logout());
        // navigate('/');
      } else {
        dispatch(showToast({ message: `Failed to load posts: ${error.message}. Please try again.`, type: 'error' }));
      }
    }
  }, [error, dispatch, navigate]);

  const openPostPopup = useCallback((post) => {
    setSelectedPost(post);
    setIsPopupOpen(true);
  }, []);

  const closePostPopup = useCallback(() => {
    setIsPopupOpen(false);
    setSelectedPost(null);
  }, []);

  const handleLike = async (postId) => {
    try {
      await invalidatePosts(); // Refetch after liking to remove liked post
    } catch (err) {
      dispatch(showToast({ message: 'Failed to update like status', type: 'error' }));
    }
  };

  const handleComment = (postId) => {
    console.log('Comment on post:', postId);
  };

  const handleShare = (postId) => {
    console.log('Share post:', postId);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#198754]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4 bg-gray-50">
        Failed to load posts: {error.message}. Please try again later.
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SideBar />
      <div ref={containerRef} className="flex-1 h-screen overflow-auto">
        {posts.length > 0 ? (
          <div
            className="relative w-full max-w-4xl mx-auto p-6"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualizer.getVirtualItems().length > 0 && (
              <div
                className="absolute top-0 left-0 w-full grid grid-cols-3 gap-2 p-6"
                style={{
                  transform: `translateY(${virtualizer.getVirtualItems()[0]?.start || 0}px)`,
                }}
              >
                {virtualizer.getVirtualItems().map(({ index, key }) => {
                  const rowPosts = posts.slice(index * 3, index * 3 + 3);
                  return (
                    <React.Fragment key={key}>
                      {rowPosts.map((post) => (
                        <Card
                          key={post?.id}
                          post={post}
                          onClick={openPostPopup}
                        />
                      ))}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-500 p-6">
            No posts available to explore.
          </div>
        )}
      </div>

      {isPopupOpen && selectedPost && (
        <PostPopup
          post={selectedPost}
          userData={{
            username: selectedPost.user.username,
            profileImage: selectedPost.user.profile_picture
              ? `${CLOUDINARY_ENDPOINT}${selectedPost.user.profile_picture}`
              : '/default-profile.png',
          }}
          isOpen={isPopupOpen}
          onClose={closePostPopup}
          onLike={handleLike} // Pass handleLike to PostPopup
        />
      )}
    </div>
  );
};

export default ExplorePage;