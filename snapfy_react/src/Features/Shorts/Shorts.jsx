// Components/Shorts/ShortsPage.jsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useShortsQuery } from '../../API/useShortsQuery';
import SideBar from '../../Components/Navbar/SideBar';
import PostPopup from '../../Components/Post/PostPopUp';
import { useSelector, useDispatch } from 'react-redux';
import { CLOUDINARY_ENDPOINT } from '../../APIEndPoints';
import { Heart, MessageCircle, Share2, Bookmark, Play, Pause, VolumeX, Volume2 } from 'lucide-react';
import { savePost, isSavedPost, removeSavedPost, likePost, isLikedPost, getLikeCount } from '../../API/postAPI';
import { showToast } from '../../redux/slices/toastSlice';

const ShortCard = ({ short, onClick }) => {
  const { user } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isManuallyControlled, setIsManuallyControlled] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [savedPostId, setSavedPostId] = useState(null);
  const [isLiked, setIsLiked] = useState(false); // Track if user liked the short
  const [likeCount, setLikeCount] = useState(short.likes || 0);

  const videoRef = useRef(null);

  const normalizeUrl = (url) => url.replace(/^(auto\/upload\/)+/, '');

  // Check initial saved and liked status
  useEffect(() => {
    const checkInitialStatus = async () => {
      try {
        // Check saved status
        const { exists, savedPostId } = await isSavedPost({ post: short.id, user: user.id });
        console.log(`Initial saved status for post ${short.id}:`, { exists, savedPostId });
        setIsSaved(exists);
        setSavedPostId(exists ? savedPostId : null);

        // Check liked status and like count
        const likedResponse = await isLikedPost({ post: short.id, user: user.id });
        console.log(`Initial liked status for post ${short.id}:`, likedResponse);
        setIsLiked(likedResponse.exists); // Use 'exists' based on logs

        const countResponse = await getLikeCount(short.id);
        console.log(`Initial like count for post ${short.id}:`, countResponse);
        setLikeCount(countResponse.likes); // Use 'likes' based on logs
      } catch (error) {
        console.error('Error checking initial status for post', short.id, error);
      }
    };
    checkInitialStatus();
  }, [short.id, user.id]);

  // Toggle play/pause
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch((err) => console.error('Play error:', err));
      }
      setIsPlaying(!isPlaying);
      setIsManuallyControlled(true);
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Update progress
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = () => {
      const progressValue = (video.currentTime / video.duration) * 100;
      setProgress(progressValue);
    };

    video.addEventListener('timeupdate', updateProgress);
    return () => video.removeEventListener('timeupdate', updateProgress);
  }, []);

  // Autoplay with IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!isManuallyControlled && videoRef.current) {
            if (entry.isIntersecting) {
              videoRef.current.play().catch((err) => console.error('Play error:', err));
              setIsPlaying(true);
            } else {
              videoRef.current.pause();
              setIsPlaying(false);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => {
      if (videoRef.current) {
        observer.unobserve(videoRef.current);
      }
    };
  }, [isManuallyControlled, short]);

  // Handle save/unsave
  const handleSave = async () => {
    try {
      if (isSaved) {
        await removeSavedPost(savedPostId);
        setIsSaved(false);
        setSavedPostId(null);
        dispatch(showToast({ message: 'Post unsaved', type: 'success' }));
      } else {
        const response = await savePost({ post: short.id, user: user.id });
        setIsSaved(true);
        setSavedPostId(response.id); // Assuming response includes saved post ID
        dispatch(showToast({ message: 'Post saved', type: 'success' }));
      }
    } catch (error) {
      dispatch(showToast({ message: 'Failed to save post', type: 'error' }));
    }
  };

  // Handle like/unlike
  const handleLike = async () => {
    try {
      console.log(`Liking/unliking post ${short.id}, current isLiked:`, isLiked);
      await likePost(short.id);
      const likedResponse = await isLikedPost({ post: short.id, user: user.id });
      console.log(`Post ${short.id} like status after toggle:`, likedResponse);
      setIsLiked(likedResponse.exists); // Use 'exists' based on logs

      const countResponse = await getLikeCount(short.id);
      console.log(`Post ${short.id} like count after toggle:`, countResponse);
      setLikeCount(countResponse.likes); // Use 'likes' based on logs

      dispatch(showToast({ message: isLiked ? 'Post unliked' : 'Post liked', type: 'success' }));
    } catch (error) {
      console.error('Error liking post:', short.id, error);
      dispatch(showToast({ message: 'Failed to like post', type: 'error' }));
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center snap-start">
      {/* Video */}
      <video
        ref={videoRef}
        src={normalizeUrl(short.file)}
        className="w-full h-full object-contain bg-[#198754]"
        loop
        muted={isMuted}
        onClick={togglePlay}
        onError={(e) => console.error('Video error:', e)}
      />

      {/* Overlay: User Info */}
      <div className="absolute top-2 left-4 text-white p-1 px-2 rounded-xl min-w-96 
     backdrop-blur-md
     bg-gradient-to-br from-white/20 to-white/5
     shadow-lg
     border border-white/20
     hover:border-white/30 transition-all duration-300 flex items-center justify-between">
        <div className="flex items-center">
            <img
            src={short.user.profile_picture ? `${CLOUDINARY_ENDPOINT}${short.user.profile_picture}` : '/default-profile.png'}
            alt={short.user.username}
            className="w-10 h-10 rounded-full mr-3 border-2 border-white/70 shadow-sm"
            onError={(e) => (e.target.src = '/default-profile.png')}
            />
            <span className="font-bold text-lg drop-shadow-sm">{short.user.username}</span>
        </div>
        <p className="text-sm font-medium max-w-xs line-clamp-2 drop-shadow-sm">{short.caption}</p>
      </div>

      {/* Action Buttons */}
      <div className="absolute right-4 bottom-20 flex flex-col items-center gap-6 text-white">
        <button 
          onClick={handleLike} 
          className="flex flex-col items-center hover:scale-110 transition-transform duration-200"
        >
          <Heart 
            size={34} 
            stroke="#198754" 
            fill={isLiked ? '#198754' : 'none'} 
          />
          <span className="text-sm text-[#198754] font-semibold mt-1">{likeCount}</span> {/* Fixed to use likeCount */}
        </button>
        <button onClick={() => onClick(short)} className="flex flex-col items-center hover:scale-110 transition-transform duration-200">
          <MessageCircle size={34} stroke="#198754" />
          <span className="text-sm text-[#198754] font-semibold mt-1">{short.comment_count || 0}</span>
        </button>
        {/* <button className="flex flex-col items-center hover:scale-110 transition-transform duration-200">
          <Share2 size={34} stroke="#198754" />
          <span className="text-sm text-[#198754] font-semibold mt-1">Share</span>
        </button> */}
        <button onClick={handleSave} className="flex flex-col items-center hover:scale-110 transition-transform duration-200">
          <Bookmark size={34} stroke="#198754" fill={isSaved ? '#198754' : 'none'} />
          <span className="text-sm text-[#198754] font-semibold mt-1">{isSaved ? 'Saved' : 'Save'}</span>
        </button>
      </div>

      {/* Video Controller */}
      <div className="absolute bottom-4 left-0 right-0 px-6">
        <div className="flex items-center gap-4 bg-black bg-opacity-40 p-2 rounded-lg mx-auto max-w-sm shadow-md">
          <button onClick={togglePlay} className="text-white hover:text-[#198754] transition-colors">
            {isPlaying ? <Pause size={22} /> : <Play size={22} />}
          </button>
          <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#198754] transition-all duration-150 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <button onClick={toggleMute} className="text-white hover:text-[#198754] transition-colors">
            {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
          </button>
        </div>
      </div>
    </div>
  );
};

const Shorts = () => {
  const { shorts = [], isLoading, error } = useShortsQuery();
  const { user } = useSelector((state) => state.user);
  const containerRef = useRef(null);
  const [selectedShort, setSelectedShort] = useState(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const virtualizer = useVirtualizer({
    count: shorts.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => window.innerHeight,
    overscan: 2,
  });

  // Use useCallback to memoize measureVirtualizer
  const measureVirtualizer = useCallback(() => {
    virtualizer.measure();
  }, [virtualizer]);

  useEffect(() => {
    // Only measure when shorts length changes to avoid infinite loop
    measureVirtualizer();
  }, [shorts.length, measureVirtualizer]);

  const openPostPopup = (short) => {
    setSelectedShort(short);
    setIsPopupOpen(true);
  };

  const closePostPopup = () => {
    setIsPopupOpen(false);
    setSelectedShort(null);
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
        Failed to load shorts: {error.message}. Please try again later.
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <SideBar />
      <div ref={containerRef} className="flex-1 overflow-y-auto snap-y snap-mandatory bg-black">
        <div
          className="relative w-full"
          style={{ height: `${virtualizer.getTotalSize()}px` }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const short = shorts[virtualItem.index];
            return (
              <div
                key={virtualItem.key}
                className="absolute top-0 left-0 w-full h-screen"
                style={{
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <ShortCard short={short} onClick={openPostPopup} />
              </div>
            );
          })}
        </div>
      </div>

      {isPopupOpen && selectedShort && (
        <PostPopup
          post={selectedShort}
          userData={{
            username: selectedShort.user.username,
            profileImage: selectedShort.user.profile_picture
              ? `${CLOUDINARY_ENDPOINT}${selectedShort.user.profile_picture}`
              : '/default-profile.png',
          }}
          isOpen={isPopupOpen}
          onClose={closePostPopup}
        />
      )}
    </div>
  );
};

export default Shorts;