import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { showToast } from '../../redux/slices/toastSlice';
import { 
  X, Camera, ChevronRight, ArrowLeft, Image, Film, 
  Scissors, Hash, AtSign, Upload, Maximize, Crop, Users
} from 'lucide-react';
import Loader from '../../utils/Loader/Loader';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const CreateContent = () => {
  const [contentType, setContentType] = useState('post'); // 'post' or 'reel'
  const [loading, setLoading] = useState(false);
  const [previewMedia, setPreviewMedia] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const [isVideoCropped, setIsVideoCropped] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1); // Default 1:1
  const [mentions, setMentions] = useState([]);
  const [hashtags, setHashtags] = useState([]);
  const [currentMention, setCurrentMention] = useState('');
  const [currentHashtag, setCurrentHashtag] = useState('');
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoStartTime, setVideoStartTime] = useState(0);
  const [videoEndTime, setVideoEndTime] = useState(60);
  
  const imageRef = useRef(null);
  const videoRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm();

  const caption = watch('caption', '');

  const centerAspectCrop = (mediaWidth, mediaHeight, aspect) => {
    return centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        aspect,
        mediaWidth,
        mediaHeight
      ),
      mediaWidth,
      mediaHeight
    );
  };

  const onMediaLoad = (e) => {
    if (contentType === 'post') {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspectRatio));
    } else if (contentType === 'reel') {
      setIsVideoCropped(false);
      const video = e.target;
      video.addEventListener('loadedmetadata', () => {
        setVideoDuration(video.duration);
        setVideoEndTime(Math.min(video.duration, 60));
        if (video.duration > 60) {
          dispatch(showToast({ 
            message: "Video exceeds 60 seconds limit. Only first 60 seconds will be used.", 
            type: 'warning' 
          }));
        }
      });
    }
  };

  const handleMediaChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const fileType = file.type
    const isVideo = file.type.startsWith('video/');
    
    if (isVideo && contentType !== 'reel') {
      setContentType('reel');
    } else if (!isVideo && contentType !== 'post') {
      setContentType('post');
    }
  

    // Validate image types
    if (contentType === 'post') {
      const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedImageTypes.includes(fileType)) {
        dispatch(showToast({
          message: "Image should be of type PNG, JPEG, JPG",
          type: "error"
        }));
        e.target.value = ''; // Reset the file input
        return;
      }
    }
    
    // Validate video types
    if (contentType === 'reel') {
      const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
      if (!allowedVideoTypes.includes(fileType)) {
        dispatch(showToast({
          message: "Video should be of type MP4, MOV, WEBM, AVI",
          type: "error"
        }));
        e.target.value = ''; // Reset the file input
        return;
      }
    }

    setSelectedFile(file);
    setPreviewMedia(URL.createObjectURL(file));
    
    if (isVideo) {
      setIsVideoCropped(false);
      setVideoStartTime(0);
      setVideoEndTime(60);
    }
  };
  
  const changeAspectRatio = (ratio) => {
    setAspectRatio(ratio);
    if (imageRef.current) {
      const { width, height } = imageRef.current;
      setCrop(centerAspectCrop(width, height, ratio));
    }
  };

  const handleAddMention = () => {
    if (currentMention && !mentions.includes(currentMention)) {
      setMentions([...mentions, currentMention]);
      setCurrentMention('');
    }
  };

  const handleAddHashtag = () => {
    if (currentHashtag && !hashtags.includes(currentHashtag)) {
      setHashtags([...hashtags, currentHashtag]);
      setCurrentHashtag('');
    }
  };

  const removeMention = (mention) => {
    setMentions(mentions.filter(m => m !== mention));
  };

  const removeHashtag = (hashtag) => {
    setHashtags(hashtags.filter(h => h !== hashtag));
  };
  
  const cropImage = async () => {
    if (!completedCrop || !imageRef.current) return null;
    
    const canvas = document.createElement('canvas');
    const scaleX = imageRef.current.naturalWidth / imageRef.current.width;
    const scaleY = imageRef.current.naturalHeight / imageRef.current.height;
    
    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      imageRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY
    );
    
    return new Promise((resolve) => {
      canvas.toBlob(blob => {
        resolve(blob);
      }, 'image/jpeg', 0.95);
    });
  };

  // Function to update video playback when trimming
  const updateVideoPlayback = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = videoStartTime;
    }
  };

  // Effect to update video playback when start time changes
  useEffect(() => {
    if (videoRef.current && contentType === 'reel') {
      updateVideoPlayback();
    }
  }, [videoStartTime]);

  const onSubmit = async (data) => {
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('caption', data.caption);
      formData.append('content_type', contentType);
      
      // Add hashtags and mentions
      formData.append('hashtags', JSON.stringify(hashtags));
      formData.append('mentions', JSON.stringify(mentions));
      
      if (contentType === 'post' && completedCrop) {
        const croppedImage = await cropImage();
        if (croppedImage) {
          formData.append('media', croppedImage, 'cropped_image.jpg');
        } else {
          formData.append('media', selectedFile);
        }
      } else if (contentType === 'reel') {
        // For reels, add trim information to be processed on server
        formData.append('media', selectedFile);
        formData.append('videoStartTime', videoStartTime.toString());
        formData.append('videoEndTime', videoEndTime.toString());
      }
      
      // Here you would make your API call to upload the content
      // const response = await uploadContent(formData);
      
      // Mock successful upload for now
      setTimeout(() => {
        setLoading(false);
        for (let [key, value] of formData.entries()){
          console.log(`key:${key}, value:${value}`)
        }
        dispatch(showToast({ 
          message: `Your ${contentType} has been uploaded successfully!`, 
          type: 'success' 
        }));
        navigate('/home');
      }, 2000);
      
    } catch (error) {
      setLoading(false);
      dispatch(showToast({ 
        message: "Error uploading content. Please try again.", 
        type: 'error' 
      }));
    }
  };

  const errorMessageClass = "mt-1 text-red-300 bg-red-900/40 text-sm flex items-center px-2 py-1 rounded-md border border-red-500/20";
  
  return loading ? <Loader /> : (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3932] via-[#198754] to-[#FF6C37] flex items-center justify-center p-6">
      <div className="w-full max-w-3xl relative">
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>

        <div className="text-center mb-8 relative">
          <div className="relative inline-block">
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#FF6C37] font-['Orbitron'] transform hover:scale-105 transition-transform duration-600 cursor-default animate-pulse">
              SNAPFY
            </h1>
            <div className="absolute -top-4 -right-4 w-8 h-8 bg-[#FF6C37] rounded-full blur-xl opacity-50 animate-pulse"></div>
          </div>
          <p className="text-white/70 mt-2 text-lg font-light tracking-wider">Create New {contentType === 'post' ? 'Post' : 'Reel'}</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#198754] via-[#1E3932] to-[#FF6C37]"></div>

          {/* Content Type Selector */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setContentType('post')}
              className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 ${
                contentType === 'post' 
                  ? 'text-white bg-[#198754]/30' 
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Image size={20} />
              <span>Post</span>
            </button>
            <button
              onClick={() => setContentType('reel')}
              className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 ${
                contentType === 'reel' 
                  ? 'text-white bg-[#FF6C37]/30' 
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Film size={20} />
              <span>Reel</span>
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* Media Preview Area */}
            <div className="flex justify-center">
              {!previewMedia ? (
                <div className="w-full h-64 border-2 border-dashed border-white/30 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#FF6C37] transition-colors duration-200"
                  onClick={() => document.getElementById('media-upload').click()}>
                  <Upload size={40} className="text-white/50 mb-4" />
                  <p className="text-white/70">Click to upload {contentType === 'post' ? 'an image' : 'a video'}</p>
                  <p className="text-white/50 text-sm mt-2">{contentType === 'post' ? 'JPG, PNG' : 'MP4, MOV (max 60s)'}</p>
                </div>
              ) : (
                <div className="relative w-full">
                  {contentType === 'post' ? (
                    <div className="mb-2">
                      <ReactCrop
                        crop={crop}
                        onChange={(c) => setCrop(c)}
                        onComplete={(c) => setCompletedCrop(c)}
                        aspect={aspectRatio}
                      >
                        <img
                          ref={imageRef}
                          src={previewMedia}
                          alt="Preview"
                          onLoad={onMediaLoad}
                          className="max-w-full max-h-96 rounded-lg"
                        />
                      </ReactCrop>
                      <div className="flex gap-2 mt-3 justify-center">
                        <button
                          type="button"
                          onClick={() => changeAspectRatio(1)}
                          className={`p-2 rounded-lg text-white ${aspectRatio === 1 ? 'bg-[#198754]' : 'bg-white/10'}`}
                        >
                          1:1
                        </button>
                        <button
                          type="button"
                          onClick={() => changeAspectRatio(4/5)}
                          className={`p-2 rounded-lg text-white ${aspectRatio === 4/5 ? 'bg-[#198754]' : 'bg-white/10'}`}
                        >
                          4:5
                        </button>
                        <button
                          type="button"
                          onClick={() => changeAspectRatio(16/9)}
                          className={`p-2 rounded-lg text-white ${aspectRatio === 16/9 ? 'bg-[#198754]' : 'bg-white/10'}`}
                        >
                          16:9
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-2">
                      <video
                        ref={videoRef}
                        src={previewMedia}
                        controls
                        onLoadedData={onMediaLoad}
                        className="max-w-full max-h-96 rounded-lg bg-black"
                      />
                      
                      {/* Video Trimming Controls */}
                      {videoDuration > 0 && (
                        <div className="mt-4">
                          <p className="text-white/70 text-center mb-2">
                            Duration: {Math.min(videoEndTime - videoStartTime, 60).toFixed(1)}s 
                            {videoDuration > 60 ? ' (from original ' + videoDuration.toFixed(1) + 's)' : ''}
                          </p>
                          
                          {videoDuration > 60 && (
                            <div className="bg-white/10 p-4 rounded-lg mb-4">
                              <p className="text-white/80 text-sm mb-3">Trim your video (max 60 seconds):</p>
                              
                              <div className="flex items-center gap-4 mb-2">
                                <div className="flex-1">
                                  <label className="text-white/70 text-xs mb-1 block">Start Time: {videoStartTime.toFixed(1)}s</label>
                                  <input 
                                    type="range" 
                                    min="0" 
                                    max={Math.max(0, videoDuration - 1)}
                                    step="0.1"
                                    value={videoStartTime}
                                    onChange={(e) => {
                                      const newStart = parseFloat(e.target.value);
                                      // Ensure end time is at least 1 second after start time and max 60 seconds
                                      const newEnd = Math.min(
                                        Math.max(newStart + 1, videoEndTime),
                                        newStart + 60
                                      );
                                      setVideoStartTime(newStart);
                                      setVideoEndTime(newEnd);
                                    }}
                                    className="w-full"
                                  />
                                </div>
                                
                                <div className="flex-1">
                                  <label className="text-white/70 text-xs mb-1 block">End Time: {videoEndTime.toFixed(1)}s</label>
                                  <input 
                                    type="range" 
                                    min={videoStartTime + 1}
                                    max={Math.min(videoDuration, videoStartTime + 60)}
                                    step="0.1"
                                    value={videoEndTime}
                                    onChange={(e) => setVideoEndTime(parseFloat(e.target.value))}
                                    className="w-full"
                                  />
                                </div>
                              </div>
                              
                              <div className="flex justify-center">
                                <button
                                  type="button"
                                  onClick={updateVideoPlayback}
                                  className="bg-[#FF6C37]/40 hover:bg-[#FF6C37]/60 text-white text-sm px-3 py-1 rounded-lg flex items-center gap-1"
                                >
                                  <Scissors size={14} />
                                  Preview Trim
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex justify-center space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        document.getElementById('media-upload').click();
                      }}
                      className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 flex items-center gap-2"
                    >
                      <Camera size={16} />
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewMedia(null);
                        setSelectedFile(null);
                      }}
                      className="bg-red-500/30 text-white px-4 py-2 rounded-lg hover:bg-red-500/50 flex items-center gap-2"
                    >
                      <X size={16} />
                      Remove
                    </button>
                  </div>
                </div>
              )}
              <input
                id="media-upload"
                type="file"
                className="hidden"
                accept={contentType === 'post' 
                  ? '.jpeg, .jpg, .png' 
                  : '.mp4, .mov, .avi, .webm'}
                onChange={handleMediaChange}
              />
            </div>

            {/* Caption */}
            <div>
              <textarea
                placeholder="Write a caption..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6C37] text-white placeholder-white/50 resize-none h-24"
                {...register('caption', {
                  required: 'Caption is required',
                  maxLength: {
                    value: 2200,
                    message: 'Caption cannot exceed 2200 characters'
                  }
                })}
              />
              <div className="flex justify-between text-white/50 text-sm mt-1">
                <span>{caption.length}/2200</span>
              </div>
              {errors.caption && (
                <p className={errorMessageClass}>
                  <X size={16} className="mr-1" /> {errors.caption.message}
                </p>
              )}
            </div>

            {/* Hashtags */}
            <div>
              <div className="flex">
                <input
                  type="text"
                  value={currentHashtag}
                  onChange={(e) => setCurrentHashtag(e.target.value.replace(/\s+/g, ''))}
                  placeholder="Add hashtag..."
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-[#FF6C37] text-white placeholder-white/50"
                />
                <button
                  type="button"
                  onClick={handleAddHashtag}
                  className="px-4 py-3 bg-[#198754]/50 text-white rounded-r-xl hover:bg-[#198754]/70 flex items-center"
                >
                  <Hash size={18} className="mr-1" /> Add
                </button>
              </div>
              
              {hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {hashtags.map((tag, index) => (
                    <div key={index} className="bg-[#198754]/30 text-white px-3 py-1 rounded-full flex items-center">
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeHashtag(tag)}
                        className="ml-2 text-white/70 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mentions */}
            <div>
              <div className="flex">
                <input
                  type="text"
                  value={currentMention}
                  onChange={(e) => setCurrentMention(e.target.value.replace(/\s+/g, ''))}
                  placeholder="Mention people..."
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-[#FF6C37] text-white placeholder-white/50"
                />
                <button
                  type="button"
                  onClick={handleAddMention}
                  className="px-4 py-3 bg-[#FF6C37]/50 text-white rounded-r-xl hover:bg-[#FF6C37]/70 flex items-center"
                >
                  <AtSign size={18} className="mr-1" /> Add
                </button>
              </div>
              
              {mentions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {mentions.map((mention, index) => (
                    <div key={index} className="bg-[#FF6C37]/30 text-white px-3 py-1 rounded-full flex items-center">
                      @{mention}
                      <button
                        type="button"
                        onClick={() => removeMention(mention)}
                        className="ml-2 text-white/70 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-white/10">
              <button
                type="submit"
                disabled={!selectedFile}
                className={`w-full py-3 px-6 ${
                  selectedFile 
                    ? 'bg-[#1E3932] hover:bg-[#198754] transform hover:scale-105' 
                    : 'bg-gray-500 cursor-not-allowed'
                } text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6C37] focus:ring-offset-2 focus:ring-offset-[#1E3932] transition-all duration-200 flex items-center justify-center group relative overflow-hidden`}
              >
                <span className="relative z-10 flex items-center">
                  Share {contentType === 'post' ? 'Post' : 'Reel'}
                  <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className={`absolute inset-0 ${selectedFile ? 'bg-gradient-to-r from-[#198754] to-[#1E3932] opacity-0 group-hover:opacity-100' : ''} transition-opacity duration-300`}></div>
              </button>

              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-full flex items-center justify-center text-white/70 hover:text-white transition-colors group mt-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateContent;