import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { 
  X, Camera, ChevronRight, ChevronLeft, Heart, Eye, Trash2, Plus, Clock, Film, Image as ImageIcon, Scissors, Video,
  Music, Play, Pause, Search
} from 'lucide-react';
import { CLOUDINARY_ENDPOINT } from '../../APIEndPoints';
import { showToast } from '../../redux/slices/toastSlice';
import { 
  createStory, getStories, getStory, deleteStory, toggleStoryLike, getStoryViewers, getMusicTracks, getLiveStreams, createLiveStream,
  getLiveStream
} from '../../API/authAPI';
import { useNavigate } from 'react-router-dom';
import { useStoriesQuery } from '../../API/useStoriesQuery';

import React from 'react';

const StoryCircle = ({ user, onClick, hasNewStory }) => {
  const userImage = user?.userImage?.includes(CLOUDINARY_ENDPOINT)
      ? user?.userImage.replace(CLOUDINARY_ENDPOINT, '')
      : user?.userImage;

  return (
      <div className="flex flex-col items-center space-y-1" onClick={onClick}>
          <div
              className={`relative w-20 h-20 rounded-full p-[2px] cursor-pointer ${
                  user.isLive
                      ? 'bg-gradient-to-br from-red-500 to-pink-500 animate-pulse'
                      : hasNewStory
                      ? 'bg-gradient-to-br from-[#198754] to-[#FF6C37] animate-pulse'
                      : user?.allStoriesSeen
                      ? 'bg-gray-300'
                      : 'bg-gradient-to-br from-[#198754] to-[#FF6C37]'
              }`}
          >
              <img
                  src={`${CLOUDINARY_ENDPOINT}${userImage}`}
                  alt={user?.username}
                  className="w-full h-full object-cover rounded-full border-2 border-white"
                  onError={(e) => (e.target.src = '/default-profile.png')}
              />
              {user?.isCurrentUser && !user.isLive && (
                  <div className="absolute bottom-0 right-0 w-6 h-6 bg-[#198754] rounded-full flex items-center justify-center border-2 border-white">
                      <Plus size={14} className="text-white" />
                  </div>
              )}
          </div>
          <span className="text-xs text-gray-600 truncate max-w-[80px] text-center">{user?.username}</span>
      </div>
  );
};


const StoryViewerModal = ({ 
  currentStory, 
  userStories, 
  userIndex, 
  storyIndex, 
  onClose, 
  onNext, 
  onPrevious, 
  onNextUser, 
  onPreviousUser, 
  onDelete, 
  isUserStory, 
  onAddNewStory 
}) => {
  const [timeLeft, setTimeLeft] = useState(10);
  const [liked, setLiked] = useState(false);
  const [viewersModalOpen, setViewersModalOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [viewers, setViewers] = useState([]);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const audioRef = useRef(null);
  const [audioReady, setAudioReady] = useState(false);

  // In StoryViewerModal component
  useEffect(() => {
    if (!currentStory?.music?.file) {
      setAudioReady(true); // No audio to wait for
      return;
    }
  
    const audio = new Audio();
    audioRef.current = audio;
    
    let fullAudioUrl = currentStory.music.file;
    
    // Fix the URL if it's missing /video/upload/
    if (fullAudioUrl.includes('res.cloudinary.com') && !fullAudioUrl.includes('video/upload')) {
      const parts = fullAudioUrl.split('/');
      const cloudName = parts[2];
      const publicId = parts.slice(3).join('/');
      fullAudioUrl = `https://res.cloudinary.com/${cloudName}/video/upload/${publicId}`;
    }
  
    console.log('Setting audio src:', fullAudioUrl);
    audio.src = fullAudioUrl;
    
    const handleCanPlay = () => {
      setAudioReady(true);
      if (!paused) {
        audio.play().catch(error => {
          console.error('Error playing audio:', error);
          dispatch(showToast({ message: 'Failed to play story music', type: 'error' }));
        });
      }
    };
  
    const handleError = () => {
      console.error('Audio loading failed');
      setAudioReady(true); // Continue without audio
    };
  
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    
    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.currentTime = 0;
    };
  }, [currentStory?.music, dispatch, paused]);

  useEffect(() => {
    if (paused) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          if (storyIndex < userStories.length - 1) {
            onNext();
          } else {
            onNextUser();
          }
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
    
    return () => clearInterval(timer);
  }, [onNext, onNextUser, storyIndex, userStories.length, paused]);
  
  useEffect(() => {
    setTimeLeft(10);
    setLiked(currentStory?.has_liked || false);
    setAudioReady(false);
    if (isUserStory) {
      fetchViewers();
    }
  }, [currentStory, isUserStory]);

  const fetchViewers = async () => {
    try {
      const data = await getStoryViewers(currentStory?.id);
      setViewers(data.viewers || []);
    } catch (error) {
      console.error('Error fetching viewers:', error);
    }
  };

  const toggleLike = async () => {
    try {
      const data = await toggleStoryLike(currentStory?.id);
      setLiked(!liked);
      currentStory.has_liked = !liked;
      currentStory.like_count = data.story.like_count;
    } catch (error) {
      dispatch(showToast({ message: 'Failed to toggle like', type: 'error' }));
    }
  };
  
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this story?')) {
      onDelete(currentStory?.id);
    }
  };
  
  const getTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    const now = new Date();
    const storyTime = new Date(timestamp);
    const diffMs = now - storyTime;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHrs < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins}m ago`;
    }
    return `${diffHrs}h ago`;
  };

  const handleMediaClick = () => {
    setPaused(!paused);
    if (audioRef.current) {
      if (paused) {
        audioRef.current.play().catch(error => {
          console.error('Error resuming audio:', error);
        });
      } else {
        audioRef.current.pause();
      }
    }
  };
  
  if (!currentStory) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      <div className="w-full flex space-x-1 px-2 mt-2">
        {userStories.map((story, idx) => (
          <div key={story?.id} className="h-1 bg-gray-700 flex-1">
            <div 
              className="h-full bg-white"
              style={{ 
                width: idx < storyIndex ? '100%' : 
                        idx === storyIndex ? `${(timeLeft / 10) * 100}%` : '0%',
                transition: idx === storyIndex && !paused ? 'width 0.1s linear' : 'none'
              }}
            ></div>
          </div>
        ))}
      </div>
      
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <img 
            src={currentStory.user?.profile_picture || "/default-profile.png"} 
            alt={currentStory.user?.username} 
            className="w-8 h-8 rounded-full object-cover" 
            onError={(e) => (e.target.src = '/default-profile.png')}
          />
          <div>
            <p 
              onClick={() => navigate(`/user/${currentStory?.user?.username}`)} 
              className="text-white font-medium cursor-pointer"
            >
              {currentStory.user?.username}
            </p>
            <p className="text-white/60 text-xs">{getTimeAgo(currentStory.created_at)}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {isUserStory && (
            <>
              <div 
                className="flex items-center space-x-1 cursor-pointer" 
                onClick={() => setViewersModalOpen(true)}
              >
                <Eye size={18} className="text-white/80" />
                <span className="text-white/80 text-sm">{currentStory.viewer_count || 0}</span>
              </div>
              <Trash2 
                size={18} 
                className="text-white/80 cursor-pointer hover:text-red-500" 
                onClick={handleDelete}
              />
              <Plus 
                size={18} 
                className="text-white/80 cursor-pointer hover:text-[#198754]" 
                onClick={onAddNewStory}
              />
            </>
          )}
          <X 
            size={24} 
            className="text-white/80 cursor-pointer hover:text-white" 
            onClick={onClose}
          />
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center relative">
        <button 
          className="absolute left-4 w-10 h-10 rounded-full bg-black/30 flex items-center justify-center text-white z-10"
          onClick={storyIndex > 0 ? onPrevious : onPreviousUser}
        >
          <ChevronLeft size={24} />
        </button>
        
        <div className="max-w-md max-h-[70vh] relative flex flex-col items-center">
          {currentStory.file?.includes('video') ? (
            <video 
              src={currentStory.file} 
              autoPlay={!paused}
              muted={!!currentStory.music} // Only mute if there's music
              playsInline
              className="max-w-full max-h-[60vh] rounded-lg cursor-pointer" 
              controls={false}
              onClick={handleMediaClick}
              onEnded={() => {
                if (storyIndex < userStories.length - 1) {
                  onNext();
                } else {
                  onNextUser();
                }
              }}
            />
          ) : (
            <img 
              src={currentStory.file || "/default-profile.png"} 
              alt="Story" 
              className="max-w-full max-h-[60vh] rounded-lg cursor-pointer" 
              onError={(e) => (e.target.src = '/default-profile.png')}
              onClick={handleMediaClick}
            />
          )}
          {currentStory.music && (
            <div className="absolute top-4 left-4 bg-black/50 text-white px-2 py-1 rounded-full text-sm flex items-center gap-1">
              <Music size={14} />
              {currentStory.music.title}
              {!audioReady && (
                <span className="text-xs text-yellow-300 ml-1">(loading...)</span>
              )}
            </div>
          )}
          {currentStory?.caption && (
            <p className="text-white text-center mt-4 max-w-md px-4">{currentStory?.caption}</p>
          )}
        </div>
        
        <button 
          className="absolute right-4 w-10 h-10 rounded-full bg-black/30 flex items-center justify-center text-white z-10"
          onClick={storyIndex < userStories.length - 1 ? onNext : onNextUser}
        >
          <ChevronRight size={24} />
        </button>
      </div>
      
      {!isUserStory && (
        <div className="p-4 flex justify-center">
          <button 
            className={`flex items-center space-x-2 px-4 py-2 rounded-full ${
              liked ? 'bg-red-500 text-white' : 'bg-white/10 text-white'
            }`}
            onClick={toggleLike}
          >
            <Heart size={18} fill={liked ? 'white' : 'none'} />
            <span>{currentStory.like_count || 0} {liked ? 'Liked' : 'Like'}</span>
          </button>
        </div>
      )}
      
      {viewersModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[70vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-medium">Story Viewers ({viewers.length})</h3>
              <X 
                size={20} 
                className="text-gray-500 cursor-pointer" 
                onClick={() => setViewersModalOpen(false)}
              />
            </div>
            
            <div className="overflow-y-auto max-h-[calc(70vh-8rem)]">
              {viewers.map(viewer => (
                <div key={viewer?.id} className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={viewer.profile_picture || "/default-profile.png"} 
                      alt={viewer.username} 
                      className="w-10 h-10 rounded-full object-cover" 
                      onError={(e) => (e.target.src = '/default-profile.png')}
                    />
                    <div>
                      <p className="font-medium">{viewer.username}</p>
                    </div>
                  </div>
                  {viewer.has_liked && (
                    <Heart size={16} className="text-red-500" fill="red" />
                  )}
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t">
              <button 
                className="w-full py-2 bg-[#198754] text-white rounded-lg"
                onClick={() => setViewersModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CreateStoryModal = ({ onClose, onSuccess }) => {
  const [mediaType, setMediaType] = useState('image');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewMedia, setPreviewMedia] = useState(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoStartTime, setVideoStartTime] = useState(0);
  const [videoEndTime, setVideoEndTime] = useState(30);
  const [musicTracks, setMusicTracks] = useState([]);
  const [filteredMusicTracks, setFilteredMusicTracks] = useState([]);
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const tracksPerPage = 10;
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const audioPreviewRef = useRef(null);
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchMusic = async () => {
      try {
        setLoading(true);
        const tracks = await getMusicTracks();
        const updatedTracks = tracks.map(track => {
          let file = track.file;
          if (file.includes('res.cloudinary.com') && !file.includes('video/upload')) {
            const parts = file.split('/');
            const cloudName = parts[2];
            const publicId = parts.slice(3).join('/');
            file = `https://res.cloudinary.com/${cloudName}/video/upload/${publicId}`;
          }
          return { ...track, file };
        });
        setMusicTracks(updatedTracks);
        setFilteredMusicTracks(updatedTracks);
      } catch (error) {
        console.error('Error fetching music tracks:', error);
        dispatch(showToast({ message: 'Failed to load music tracks', type: 'error' }));
      } finally {
        setLoading(false);
      }
    };
    fetchMusic();
  }, [dispatch]);

  useEffect(() => {
    const filtered = musicTracks.filter(track =>
      track.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredMusicTracks(filtered);
    setCurrentPage(1);
  }, [searchQuery, musicTracks]);

  const playPreview = (track) => {
    if (audioPreviewRef.current) {
      let fullAudioUrl = track.file;
      if (fullAudioUrl.includes('res.cloudinary.com') && !fullAudioUrl.includes('video/upload')) {
        const parts = fullAudioUrl.split('/');
        const cloudName = parts[2];
        const publicId = parts.slice(3).join('/');
        fullAudioUrl = `https://res.cloudinary.com/${cloudName}/video/upload/${publicId}`;
      }
      
      console.log('Playing preview for:', track.title, 'URL:', fullAudioUrl);
      
      if (previewPlaying === track.id) {
        audioPreviewRef.current.pause();
        setPreviewPlaying(null);
      } else {
        audioPreviewRef.current.src = fullAudioUrl;
        audioPreviewRef.current.play().catch(error => {
          console.error('Error playing preview:', error);
          dispatch(showToast({ message: 'Failed to play preview', type: 'error' }));
        });
        setPreviewPlaying(track.id);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
    };
  }, []);

  const validateFile = (file) => {
    if (!file) return false;
    
    const fileType = file.type;
    const isVideo = fileType.startsWith('video/');
    const fileSizeMB = file.size / (1024 * 1024);
    
    if (isVideo) {
      setMediaType('video');
      const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
      if (!allowedTypes.includes(fileType)) {
        setValidationError('Invalid video format. Please use MP4, MOV, or WEBM.');
        return false;
      }
      if (fileSizeMB > 50) {
        setValidationError('Video file is too large. Maximum size is 50MB.');
        return false;
      }
    } else {
      setMediaType('image');
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(fileType)) {
        setValidationError('Invalid image format. Please use JPG or PNG.');
        return false;
      }
      if (fileSizeMB > 10) {
        setValidationError('Image file is too large. Maximum size is 10MB.');
        return false;
      }
    }
    
    setValidationError('');
    return true;
  };

  const onVideoLoad = (e) => {
    const duration = e.target.duration;
    setVideoDuration(duration);
    const initialEndTime = Math.min(duration, 30);
    setVideoEndTime(initialEndTime);
    if (duration < 3) {
      setValidationError('Video must be at least 3 seconds long.');
    } else if (duration > 30) {
      dispatch(showToast({ 
        message: 'Video exceeds 30 seconds. Trim below (max 30s, min 3s).', 
        type: 'warning' 
      }));
    }
  };

  const updateVideoPlayback = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = videoStartTime;
    }
  };

  const handleMediaChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const isValid = validateFile(file);
    if (!isValid) return;
    
    setSelectedFile(file);
    setPreviewMedia(URL.createObjectURL(file));
    setVideoDuration(0);
    setVideoStartTime(0);
    setVideoEndTime(30);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    const trimmedDuration = videoEndTime - videoStartTime;
    if (mediaType === 'video' && (trimmedDuration < 3 || trimmedDuration > 30)) {
      setValidationError('Video duration must be between 3 and 30 seconds.');
      return;
    }
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('caption', caption);
      if (mediaType === 'video') {
        formData.append('videoStartTime', videoStartTime);
        formData.append('videoEndTime', videoEndTime);
      }
      if (selectedMusic) {
        formData.append('music_id', selectedMusic.id);
      }
      const response = await createStory(formData);
      console.log('Story created:', response);
      dispatch(showToast({ message: 'Story created successfully', type: 'success' }));
      onSuccess(response);
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Error creating story. Please try again.';
      console.error('Error creating story:', error);
      setValidationError(errorMessage);
      dispatch(showToast({ message: errorMessage, type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  // Pagination logic
  const indexOfLastTrack = currentPage * tracksPerPage;
  const indexOfFirstTrack = indexOfLastTrack - tracksPerPage;
  const currentTracks = filteredMusicTracks.slice(indexOfFirstTrack, indexOfLastTrack);
  const totalPages = Math.ceil(filteredMusicTracks.length / tracksPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Generate pagination items with ellipses
  const getPaginationItems = () => {
    const items = [];
    const maxPagesToShow = 5; // Show up to 5 page numbers at a time
    let startPage, endPage;

    if (totalPages <= maxPagesToShow) {
      startPage = 1;
      endPage = totalPages;
    } else {
      const maxPagesBeforeCurrent = Math.floor(maxPagesToShow / 2);
      const maxPagesAfterCurrent = Math.ceil(maxPagesToShow / 2) - 1;

      startPage = Math.max(currentPage - maxPagesBeforeCurrent, 1);
      endPage = Math.min(currentPage + maxPagesAfterCurrent, totalPages);

      if (endPage - startPage < maxPagesToShow - 1) {
        if (currentPage <= maxPagesBeforeCurrent) {
          endPage = startPage + maxPagesToShow - 1;
        } else {
          startPage = endPage - maxPagesToShow + 1;
        }
      }
    }

    // Add first page and ellipsis
    if (startPage > 1) {
      items.push(1);
      if (startPage > 2) {
        items.push('...');
      }
    }

    // Add page numbers
    for (let i = startPage; i <= endPage; i++) {
      items.push(i);
    }

    // Add last page and ellipsis
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push('...');
      }
      items.push(totalPages);
    }

    return items;
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center p-6 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto my-6">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-gray-800">Create New Story</h3>
          <X size={20} className="text-gray-500 cursor-pointer hover:text-gray-700" onClick={onClose} />
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-4">
            {validationError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                {validationError}
              </div>
            )}
            
            {!previewMedia ? (
              <div 
                className="w-full h-64 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#198754] transition"
                onClick={() => fileInputRef.current.click()}
              >
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  {mediaType === 'image' ? (
                    <ImageIcon size={24} className="text-gray-500" />
                  ) : (
                    <Film size={24} className="text-gray-500" />
                  )}
                </div>
                <p className="text-gray-500 font-medium">Click to upload {mediaType === 'image' ? 'an image' : 'a video'}</p>
                <p className="text-gray-400 text-sm mt-2">{mediaType === 'image' ? 'JPG, PNG (max 10MB)' : 'MP4, MOV (max 30s, 50MB)'}</p>
                
                <div className="flex mt-4 gap-2">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setMediaType('image'); }}
                    className={`px-4 py-2 rounded-lg font-medium ${mediaType === 'image' ? 'bg-[#198754] text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    Image
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setMediaType('video'); }}
                    className={`px-4 py-2 rounded-lg font-medium ${mediaType === 'video' ? 'bg-[#198754] text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    Video
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative w-full">
                {mediaType === 'image' ? (
                  <img src={previewMedia} alt="Preview" className="w-full max-h-64 object-contain rounded-lg" />
                ) : (
                  <div>
                    <video
                      ref={videoRef}
                      src={previewMedia}
                      controls
                      onLoadedMetadata={onVideoLoad}
                      className="w-full max-h-64 object-contain rounded-lg"
                    />
                    {videoDuration > 0 && (
                      <div className="mt-4 bg-gray-100 p-4 rounded-lg">
                        <p className="text-gray-700 text-sm mb-2">
                          Duration: {(videoEndTime - videoStartTime).toFixed(1)}s 
                          {videoDuration > 30 ? ` (from ${videoDuration.toFixed(1)}s)` : ''}
                        </p>
                        <div className="flex items-center gap-4 mb-2">
                          <div className="flex-1">
                            <label className="text-gray-600 text-xs mb-1 block">Start: {videoStartTime.toFixed(1)}s</label>
                            <input 
                              type="range" 
                              min="0" 
                              max={videoDuration - 3}
                              step="0.1"
                              value={videoStartTime}
                              onChange={(e) => {
                                const newStart = parseFloat(e.target.value);
                                const minEnd = newStart + 3;
                                const maxEnd = Math.min(videoDuration, newStart + 30);
                                setVideoStartTime(newStart);
                                setVideoEndTime(Math.max(minEnd, Math.min(maxEnd, videoEndTime)));
                              }}
                              className="w-full accent-[#198754]"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-gray-600 text-xs mb-1 block">End: {videoEndTime.toFixed(1)}s</label>
                            <input 
                              type="range" 
                              min={videoStartTime + 3}
                              max={Math.min(videoDuration, videoStartTime + 30)}
                              step="0.1"
                              value={videoEndTime}
                              onChange={(e) => setVideoEndTime(parseFloat(e.target.value))}
                              className="w-full accent-[#198754]"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={updateVideoPlayback}
                          className="bg-[#198754] text-white px-3 py-1 rounded-lg flex items-center gap-1 mx-auto hover:bg-[#157347] transition"
                        >
                          <Scissors size={14} /> Preview Trim
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setShowMusicPicker(true)}
                    className="w-full flex items-center justify-between p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                  >
                    <span className="flex items-center gap-2 text-gray-700">
                      <Music size={16} />
                      {selectedMusic ? selectedMusic.title : 'Add Music'}
                    </span>
                    <ChevronRight size={16} className="text-gray-500" />
                  </button>
                </div>

                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption..."
                  className="w-full mt-4 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-[#198754] focus:border-[#198754] transition"
                  rows="3"
                  maxLength="200"
                />
                
                <div className="flex justify-center space-x-3 mt-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current.click()}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 flex items-center gap-2 transition"
                  >
                    <Camera size={16} />
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() => { 
                      setPreviewMedia(null); 
                      setSelectedFile(null); 
                      setCaption(''); 
                      setValidationError(''); 
                      setVideoDuration(0);
                      setSelectedMusic(null);
                    }}
                    className="bg-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-200 flex items-center gap-2 transition"
                  >
                    <X size={16} />
                    Remove
                  </button>
                </div>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={mediaType === 'image' ? '.jpeg, .jpg, .png' : '.mp4, .mov, .webm'}
              onChange={handleMediaChange}
            />
            {showMusicPicker && (
              <div className="fixed inset-0 bg-white z-20 flex flex-col">
                <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-800">Select Music</h3>
                  <X 
                    size={20} 
                    className="text-gray-500 cursor-pointer hover:text-gray-700 transition" 
                    onClick={() => {
                      setShowMusicPicker(false);
                      setPreviewPlaying(null);
                      setSearchQuery('');
                      if (audioPreviewRef.current) audioPreviewRef.current.pause();
                    }} 
                    aria-label="Close music picker"
                  />
                </div>
                <div className="p-4 flex-1 overflow-y-auto">
                  <div className="mb-4 relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search music..."
                      className="w-full p-3 pl-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#198754] focus:border-[#198754] transition text-gray-700"
                      aria-label="Search music tracks"
                    />
                    <Search size={22} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  </div>
                  {loading ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#198754]"></div>
                    </div>
                  ) : currentTracks.length > 0 ? (
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                      {currentTracks.map(track => (
                        <div
                          key={track.id}
                          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition bg-white shadow-sm ${
                            selectedMusic?.id === track.id ? 'border-2 border-[#198754] bg-[#198754]/5' : 'border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div 
                            className="flex items-center gap-3 flex-1"
                            onClick={() => {
                              setSelectedMusic(track);
                              setShowMusicPicker(false);
                              setPreviewPlaying(null);
                              setSearchQuery('');
                              if (audioPreviewRef.current) audioPreviewRef.current.pause();
                            }}
                            aria-label={`Select ${track.title}`}
                          >
                            <Music size={20} className="text-gray-600" />
                            <span className="text-gray-800 truncate font-medium">{track.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {track.is_trending && (
                              <span className="text-xs bg-[#198754] text-white px-2 py-1 rounded-full font-medium">Trending</span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                playPreview(track);
                              }}
                              className="p-2 rounded-full hover:bg-gray-200 transition"
                              aria-label={previewPlaying === track.id ? `Pause ${track.title}` : `Play ${track.title}`}
                            >
                              {previewPlaying === track.id ? (
                                <Pause size={20} className="text-[#198754]" />
                              ) : (
                                <Play size={20} className="text-[#198754]" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8">No music tracks found</p>
                  )}
                  {totalPages > 1 && (
                    <div className="mt-4 p-4 bg-white border-t sticky bottom-0 z-10 flex items-center justify-center space-x-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`w-10 h-10 flex items-center justify-center rounded-full transition ${
                          currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#198754] text-white hover:bg-[#157347]'
                        }`}
                        aria-label="Previous page"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      {getPaginationItems().map((item, index) => (
                        <button
                          key={index}
                          onClick={() => typeof item === 'number' && handlePageChange(item)}
                          disabled={item === '...'}
                          className={`w-10 h-10 flex items-center justify-center rounded-full transition ${
                            item === currentPage
                              ? 'bg-[#198754] text-white'
                              : item === '...' 
                                ? 'bg-white text-gray-500 cursor-default' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                          aria-label={typeof item === 'number' ? `Page ${item}` : undefined}
                        >
                          {item}
                        </button>
                      ))}
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`w-10 h-10 flex items-center justify-center rounded-full transition ${
                          currentPage === totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#198754] text-white hover:bg-[#157347]'
                        }`}
                        aria-label="Next page"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMusic(null);
                      setShowMusicPicker(false);
                      setPreviewPlaying(null);
                      setSearchQuery('');
                      if (audioPreviewRef.current) audioPreviewRef.current.pause();
                    }}
                    className="w-full mt-3 p-3 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition font-medium"
                    aria-label="Remove music"
                  >
                    Remove Music
                  </button>
                </div>
                <audio ref={audioPreviewRef} />
              </div>
            )}
          </div>
          
          <div className="p-4 border-t sticky bottom-0 bg-white z-10">
            <button
              type="submit"
              disabled={!selectedFile || loading || validationError}
              className={`w-full py-3 px-6 rounded-xl font-medium transition-all duration-200 flex items-center justify-center ${
                selectedFile && !loading && !validationError
                  ? 'bg-[#198754] hover:bg-[#157347] hover:scale-105 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              aria-label="Share story"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-white"></div>
              ) : (
                'Share Story'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


import LiveStreamModal from './LiveStreamModal';
import { refreshToken } from '../../API/authAPI';


const UserStories = () => {
  const [viewingUserIndex, setViewingUserIndex] = useState(null);
  const [viewingStoryIndex, setViewingStoryIndex] = useState(0);
  const [creatingStory, setCreatingStory] = useState(false);
  const [liveStream, setLiveStream] = useState(null);
  const [usersWithStories, setUsersWithStories] = useState([]);
  const [liveStreams, setLiveStreams] = useState([]);
  const [page, setPage] = useState(1);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const scrollRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.user);
  const queryClient = useQueryClient();
  const MAX_RECONNECT_ATTEMPTS = 50; // Allow more retries for persistent issues
  const BASE_RECONNECT_DELAY = 1000;
  const MAX_RECONNECT_DELAY = 10000; // Cap delay at 10 seconds

  const {
    stories,
    totalCount,
    next,
    previous,
    isLoading,
    error,
    invalidateStories,
  } = useStoriesQuery({ page, pageSize: 10 });

  useEffect(() => {
    if (!user?.id) {
      console.log('No user, skipping WebSocket connection');
      return;
    }

    const getAccessToken = () => {
      return document.cookie
        .split('; ')
        .find(row => row.startsWith('access_token='))
        ?.split('=')[1];
    };

    const connectWebSocket = () => {
      const accessToken = getAccessToken();
      if (!accessToken) {
        console.warn('No access token found');
        setConnectionError('Please log in to view live streams');
        dispatch(showToast({ message: 'Please log in to view live streams', type: 'error' }));
        navigate('/');
        return;
      }

      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        console.log('Closing existing WebSocket connection');
        wsRef.current.close(1000, 'Reconnecting');
      }

      // URL construction
      let wsUrl;
      const backendHost = 'snapfyimg-676661542025.asia-south1.run.app';
      if (process.env.NODE_ENV === 'development') {
        wsUrl = `ws://localhost:8000/ws/live/global/?token=${encodeURIComponent(accessToken)}`;
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${backendHost}/ws/live/global/?token=${encodeURIComponent(accessToken)}`;
      }
      console.log('Connecting to WebSocket:', wsUrl);
      const websocket = new WebSocket(wsUrl);
      wsRef.current = websocket;

      websocket.onopen = () => {
        console.log('Global live stream WebSocket connected');
        setIsConnected(true);
        setConnectionState('connected');
        setConnectionAttempts(0);
        setConnectionError(null);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message:', data);
          if (data.type === 'live_stream_update') {
            const streamData = data.live_stream;
            if (!streamData?.host?.id) {
              console.warn('Invalid live_stream_update:', streamData);
              return;
            }
            setLiveStreams((prev) => {
              if (!streamData.is_active) {
                return prev.filter((stream) => stream.id !== streamData.id);
              }
              const updated = prev.filter((stream) => stream.id !== streamData.id);
              return [...updated, streamData];
            });
            setUsersWithStories((prev) =>
              prev.map((u) => ({
                ...u,
                isLive: u.userId === streamData.host.id && streamData.is_active,
              }))
            );
            if (!streamData.is_active && liveStream?.id === streamData.id) {
              setLiveStream(null);
            }
          } else if (data.type === 'active_streams') {
            setLiveStreams(data.streams.filter((stream) => stream.is_active));
            setUsersWithStories((prev) =>
              prev.map((u) => ({
                ...u,
                isLive: data.streams.some((live) => live.host.id === u.userId && live.is_active),
              }))
            );
          } else if (data.type === 'pong') {
            console.log('Received pong from server');
          } else if (data.error) {
            console.error('WebSocket server error:', data.error);
            setConnectionError(data.error);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      websocket.onerror = (event) => {
        console.error('WebSocket error:', event);
        setIsConnected(false);
        
        // More specific error handling
        if (!navigator.onLine) {
          setConnectionError('Network connection lost');
        } else {
          setConnectionError('WebSocket connection error');
        }
        
        // Immediate reconnect for certain errors
        if (!reconnectTimeoutRef.current && connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(1000, MAX_RECONNECT_DELAY); // Shorter delay for immediate retry
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay);
        }
      };
      
      websocket.onclose = (event) => {
        console.log(`WebSocket closed: ${event.code} - ${event.reason}`);
        setIsConnected(false);
        wsRef.current = null;
      
        // Handle specific closure codes
        if (event.code === 4001) {
          setConnectionError('Session expired, please log in again');
          dispatch(showToast({ message: 'Session expired, please log in again', type: 'error' }));
          navigate('/');
          return;
        }
      
        if (event.code === 1006) {
          console.warn('Abnormal closure detected, attempting reconnect');
        }
      
        if (connectionAttempts < MAX_RECONNECT_ATTEMPTS && event.code !== 1000) {
          const newAttempts = connectionAttempts + 1;
          setConnectionAttempts(newAttempts);
          const delay = Math.min(
            BASE_RECONNECT_DELAY * Math.pow(2, Math.min(newAttempts, 5)), // Cap exponential growth
            MAX_RECONNECT_DELAY
          );
          console.log(`Reconnecting in ${delay}ms (Attempt ${newAttempts})`);
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay);
        } else if (event.code !== 1000) {
          console.error('Max reconnect attempts reached');
          setConnectionError('Unable to connect to live streams. Please refresh the page.');
          dispatch(showToast({ 
            message: 'Unable to connect to live streams. Please refresh the page.', 
            type: 'error' 
          }));
        }
      };
    };

    connectWebSocket();

    // In your useEffect
    const heartbeatInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          console.log('Sending ping to server');
          wsRef.current.send(JSON.stringify({ type: 'ping' }));
          
          // Add timeout for pong response
          const pongTimeout = setTimeout(() => {
            if (wsRef.current && isConnected) {
              console.warn('Pong timeout, closing connection');
              wsRef.current.close(1006, 'Pong timeout');
            }
          }, 3000); // 3 second timeout
          
          // Cleanup timeout on pong
          const pongHandler = () => {
            clearTimeout(pongTimeout);
            wsRef.current?.removeEventListener('message', pongHandler);
          };
          
          wsRef.current.addEventListener('message', pongHandler);
          
        } catch (error) {
          console.error('Failed to send heartbeat:', error);
          setConnectionError('Connection lost');
          if (wsRef.current) {
            wsRef.current.close(1006, 'Heartbeat failed');
          }
        }
      } else if (isConnected && connectionAttempts < MAX_RECONNECT_ATTEMPTS && !reconnectTimeoutRef.current) {
        console.log('Connection appears dead, reconnecting...');
        connectWebSocket();
      }
    }, 15000); // 15 seconds between pings

    return () => {
      console.log('Cleaning up WebSocket connection');
      clearInterval(heartbeatInterval);
      if (wsRef.current) {
        // Remove all event listeners first
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        
        // Then close
        if (wsRef.current.readyState !== WebSocket.CLOSED) {
          wsRef.current.close(1000, 'Component unmounting');
        }
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [dispatch, user?.id, navigate, connectionAttempts, isConnected]);

  const handleReconnect = () => {
    setConnectionAttempts(0);
    setConnectionError(null);
    connectWebSocket();
  };

  useEffect(() => {
    const fetchLiveStreams = async () => {
      try {
        const data = await getLiveStreams();
        setLiveStreams(data.filter((stream) => stream.is_active));
      } catch (error) {
        if (error.response?.status === 404) {
          console.warn('Some live streams not found, filtering available streams');
          setLiveStreams([]);
        } else {
          console.error('Error fetching live streams:', error);
          dispatch(showToast({ message: 'Failed to load live streams', type: 'error' }));
        }
      }
    };
    fetchLiveStreams();
  }, [dispatch]);

  const virtualizer = useVirtualizer({
    count: usersWithStories.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 100,
    overscan: 5,
    horizontal: true,
  });

  useEffect(() => {
    if (isLoading || error) return;

    const groupedStories = {};
    stories.forEach((story) => {
      const userId = story?.user?.id;
      if (!groupedStories[userId]) {
        groupedStories[userId] = {
          userId,
          username: story.user.username,
          userImage: story.user.profile_picture,
          isCurrentUser: story?.user?.id === user?.id,
          stories: [],
          allStoriesSeen: true,
          hasNewStory: false,
          isLive: liveStreams.some((live) => live.host.id === userId && live.is_active),
        };
      }
      groupedStories[userId].stories.push(story);
      if (!story.is_seen && story?.user?.id !== user?.id) {
        groupedStories[userId].allStoriesSeen = false;
        groupedStories[userId].hasNewStory = true;
      }
    });

    Object.values(groupedStories).forEach((user) => {
      user.stories.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    });

    let usersArray = Object.values(groupedStories);
    const currentUserExists = usersArray.some((u) => u.isCurrentUser);

    if (!currentUserExists) {
      usersArray.unshift({
        userId: user?.id,
        username: user?.username,
        userImage: user?.profile_picture,
        isCurrentUser: true,
        stories: [],
        allStoriesSeen: true,
        hasNewStory: false,
        isLive: liveStreams.some((live) => live.host.id === user?.id && live.is_active),
      });
    } else {
      const currentUserIndex = usersArray.findIndex((u) => u.isCurrentUser);
      const [currentUser] = usersArray.splice(currentUserIndex, 1);
      usersArray.unshift(currentUser);
    }

    setUsersWithStories((prev) => {
      if (JSON.stringify(prev) !== JSON.stringify(usersArray)) {
        return usersArray;
      }
      return prev;
    });
  }, [stories, user?.id, user?.username, user?.profile_picture, isLoading, error, liveStreams]);

  useEffect(() => {
    if (error) {
      if (error.response?.status === 401) {
        dispatch(showToast({ message: 'Session expired. Please log in again.', type: 'error' }));
        navigate('/');
      } else {
        dispatch(showToast({ message: 'Failed to load stories', type: 'error' }));
      }
    }
  }, [error, dispatch, navigate]);

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollLeft += direction === 'right' ? scrollAmount : -scrollAmount;
      if (
        direction === 'right' &&
        scrollRef.current.scrollLeft + scrollRef.current.clientWidth >= scrollRef.current.scrollWidth - 100 &&
        next
      ) {
        setPage((prev) => prev + 1);
      }
    }
  };

  const handleUserStoryClick = async (userIndex) => {
    const userStories = usersWithStories[userIndex];
  
    if (userStories.isLive) {
      const live = liveStreams.find((l) => l.host.id === userStories.userId && l.is_active);
      if (live) {
        try {
          const streamData = await getLiveStream(live.id);
          if (streamData.is_active) {
            setLiveStream(streamData);
            navigate(`/live/${live.id}`);
          } else {
            dispatch(showToast({ message: 'Live stream has ended', type: 'info' }));
          }
        } catch (error) {
          console.error('Error fetching live stream:', error);
          dispatch(showToast({ message: 'Live stream not available', type: 'error' }));
        }
        return;
      } else {
        dispatch(showToast({ message: 'Live stream has ended', type: 'info' }));
        return;
      }
    }
  
    if (userStories.isCurrentUser && userStories.stories.length === 0) {
      setCreatingStory(true);
      return;
    }
  
    const updatedUsers = [...usersWithStories];
    const updatedUser = { ...userStories };
  
    for (const story of updatedUser.stories) {
      if (!story.is_seen && !updatedUser.isCurrentUser) {
        try {
          const updatedStory = await getStory(story.id);
          story.is_seen = true;
          story.viewer_count = updatedStory.viewer_count;
        } catch (error) {
          console.error('Error marking story as seen:', error);
        }
      }
    }
  
    updatedUser.allStoriesSeen = updatedUser.stories.every((story) => story.is_seen);
    updatedUser.hasNewStory = !updatedUser.allStoriesSeen;
    updatedUsers[userIndex] = updatedUser;
    setUsersWithStories(updatedUsers);
    invalidateStories();
  
    setViewingUserIndex(userIndex);
    setViewingStoryIndex(0);
  };

  const handleGoLive = async () => {
    try {
      const title = prompt('Enter a title for your live stream:');
      if (title === null || title.trim() === '') {
        dispatch(showToast({ message: 'Live stream title cannot be empty', type: 'error' }));
        return;
      }

      // Create the live stream with proper parameters
      const newLiveStream = await createLiveStream({ 
        title: title, 
        endExisting: false 
      });
      
      // Verify the stream exists before navigating
      const verifiedStream = await getLiveStream(newLiveStream.id);
      
      if (!verifiedStream || !verifiedStream.is_active) {
        throw new Error('Failed to start live stream');
      }

      setLiveStream(verifiedStream);
      setLiveStreams(prev => [...prev, verifiedStream]);
      dispatch(showToast({ message: 'Live stream started!', type: 'success' }));
      navigate(`/live/${verifiedStream.id}`);
    } catch (error) {
      const errorData = error.response?.data;
      if (errorData?.error === 'You already have an active live stream' && errorData.live_stream_id) {
        const userConfirmed = window.confirm(
          'You already have an active live stream. Would you like to end it and start a new one?'
        );
        if (userConfirmed) {
          try {
            const newLiveStream = await createLiveStream({ title, endExisting: true });
            setLiveStream(newLiveStream);
            setLiveStreams(prev => [...prev, newLiveStream]);
            dispatch(showToast({ message: 'New live stream started!', type: 'success' }));
            navigate(`/live/${newLiveStream.id}`);
          } catch (newError) {
            dispatch(showToast({ message: 'Failed to start new live stream', type: 'error' }));
          }
        } else {
          dispatch(showToast({ message: 'Redirecting to existing live stream', type: 'info' }));
          navigate(`/live/${errorData.live_stream_id}`);
        }
      } else {
        console.error('Error starting live stream:', error);
        dispatch(showToast({ 
          message: error.response?.data?.error || 'Failed to start live stream', 
          type: 'error' 
        }));
      }
    }
  };

  const handleNextStory = () => {
    if (viewingStoryIndex < usersWithStories[viewingUserIndex]?.stories?.length - 1) {
      setViewingStoryIndex(viewingStoryIndex + 1);
    }
  };

  const handlePreviousStory = () => {
    if (viewingStoryIndex > 0) {
      setViewingStoryIndex(viewingStoryIndex - 1);
    }
  };

  const handleNextUser = () => {
    if (viewingUserIndex === null || !usersWithStories[viewingUserIndex]) return;

    const updatedUsers = [...usersWithStories];
    const currentUser = updatedUsers[viewingUserIndex];

    currentUser.allStoriesSeen = currentUser.stories.every((story) => story.is_seen);
    currentUser.hasNewStory = !currentUser.allStoriesSeen;
    updatedUsers[viewingUserIndex] = currentUser;
    setUsersWithStories(updatedUsers);

    if (viewingUserIndex < usersWithStories.length - 1) {
      setViewingUserIndex(viewingUserIndex + 1);
      setViewingStoryIndex(0);
    } else {
      setViewingUserIndex(null);
    }
  };

  const handlePreviousUser = () => {
    if (viewingUserIndex > 0) {
      setViewingUserIndex(viewingUserIndex - 1);
      setViewingStoryIndex(usersWithStories[viewingUserIndex - 1].stories.length - 1);
    }
  };

  const handleDeleteStory = async (storyId) => {
    try {
      await deleteStory(storyId);
      const updatedUsers = [...usersWithStories];
      const currentUser = updatedUsers[viewingUserIndex];
      currentUser.stories = currentUser.stories.filter((story) => story.id !== storyId);

      if (currentUser.stories.length === 0) {
        setViewingUserIndex(null);
        currentUser.hasNewStory = false;
      } else if (viewingStoryIndex >= currentUser.stories.length) {
        setViewingStoryIndex(currentUser.stories.length - 1);
      }

      setUsersWithStories(updatedUsers);
      invalidateStories();
      dispatch(showToast({ message: 'Story deleted successfully', type: 'success' }));
    } catch (error) {
      dispatch(showToast({ message: 'Failed to delete story', type: 'error' }));
    }
  };

  const handleStoryCreated = (newStory) => {
    const updatedUsers = [...usersWithStories];
    const currentUserIndex = updatedUsers.findIndex((u) => u.isCurrentUser);

    if (currentUserIndex !== -1) {
      updatedUsers[currentUserIndex].stories.push(newStory);
      updatedUsers[currentUserIndex].hasNewStory = true;
    } else {
      updatedUsers.unshift({
        userId: user?.id,
        username: user?.username,
        userImage: user?.profile_picture,
        isCurrentUser: true,
        stories: [newStory],
        allStoriesSeen: false,
        hasNewStory: true,
        isLive: false,
      });
    }
    setUsersWithStories(updatedUsers);
    invalidateStories();
    setCreatingStory(false);
    setViewingUserIndex(0);
    setViewingStoryIndex(updatedUsers[0].stories.length - 1);
  };

  const handleAddNewStory = () => {
    setViewingUserIndex(null);
    setCreatingStory(true);
  };

  return (
    <div className="my-4">
      {connectionError && (
        <div className="text-center text-red-500 p-4">
          {connectionError}
          <button
            onClick={handleReconnect}
            className="ml-2 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry Connection
          </button>
        </div>
      )}
      {connectionState === 'connecting' && (
        <div className="text-center text-blue-500 p-2">
          Connecting to live updates...
        </div>
      )}

      <div className="relative flex items-center">
        {usersWithStories.length > 4 && (
          <button
            className="absolute left-0 z-10 w-8 h-8 bgundant-to-br from-[#198754] to-[#FF6C37] shadow-md rounded-full flex items-center justify-center"
            onClick={() => handleScroll('left')}
          >
            <ChevronLeft size={18} />
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex overflow-x-auto scrollbar-hide py-2 px-2 w-full scroll-smooth"
          style={{ height: '120px' }}
        >
          {isLoading ? (
            <div className="flex justify-center items-center w-full">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#198754]"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-500 p-4 w-full">Failed to load stories</div>
          ) : usersWithStories.length > 0 ? (
            <div style={{ width: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const userData = usersWithStories[virtualItem.index];
                return (
                  <div
                    key={virtualItem.key}
                    className="absolute top-0 left-0"
                    style={{
                      transform: `translateX(${virtualItem.start}px)`,
                      width: '100px',
                      height: '100%',
                    }}
                  >
                    <div className="relative">
                      <StoryCircle
                        user={userData}
                        onClick={() => handleUserStoryClick(virtualItem.index)}
                        hasNewStory={userData.hasNewStory}
                      />
                      {userData.isLive && (
                        <span className="absolute bottom-5 left-1/2 transform -translate-x-1/2 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full font-medium">
                          LIVE
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500 p-4 w-full">No stories available</div>
          )}
        </div>

        {usersWithStories.length > 4 && (
          <button
            className="absolute right-0 z-10 w-8 h-8 bg-gray-100 shadow-md rounded-full flex items-center justify-center"
            onClick={() => handleScroll('right')}
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      <div className="flex justify-center mt-2">
        <button
          onClick={handleGoLive}
          className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
        >
          <Video size={18} />
          <span>Go Live</span>
        </button>
      </div>

      {viewingUserIndex !== null && usersWithStories[viewingUserIndex]?.stories?.[viewingStoryIndex] && (
        <StoryViewerModal
          currentStory={usersWithStories[viewingUserIndex].stories[viewingStoryIndex]}
          userStories={usersWithStories[viewingUserIndex].stories}
          userIndex={viewingUserIndex}
          storyIndex={viewingStoryIndex}
          onClose={() => setViewingUserIndex(null)}
          onNext={handleNextStory}
          onPrevious={handlePreviousStory}
          onNextUser={handleNextUser}
          onPreviousUser={handlePreviousUser}
          onDelete={handleDeleteStory}
          isUserStory={usersWithStories[viewingUserIndex].isCurrentUser}
          onAddNewStory={handleAddNewStory}
        />
      )}

      {creatingStory && (
        <CreateStoryModal
          onClose={() => setCreatingStory(false)}
          onSuccess={handleStoryCreated}
        />
      )}

      {liveStream && (
        <LiveStreamModal
          liveStream={liveStream}
          onClose={() => {
            setLiveStream(null);
            setLiveStreams((prev) => prev.filter((stream) => stream.id !== liveStream.id));
          }}
          isHost={liveStream.host.id === user.id}
        />
      )}
    </div>
  );
};

export default UserStories;