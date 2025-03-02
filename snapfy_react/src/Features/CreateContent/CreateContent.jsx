import { useState, useRef, useEffect, useCallback } from 'react';
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
import { createPost } from '../../API/postAPI';
import { checkUserExists } from '../../API/authAPI';
import debounce from 'lodash/debounce';

const CreateContent = () => {
  const [contentType, setContentType] = useState('post');
  const [loading, setLoading] = useState(false);
  const [previewMedia, setPreviewMedia] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const [isVideoCropped, setIsVideoCropped] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1);
  const [mentions, setMentions] = useState([]);
  const [hashtags, setHashtags] = useState([]);
  const [currentMention, setCurrentMention] = useState('');
  const [currentHashtag, setCurrentHashtag] = useState('');
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoStartTime, setVideoStartTime] = useState(0);
  const [videoEndTime, setVideoEndTime] = useState(60);
  const [isMentionValid, setIsMentionValid] = useState(null);
  const [readyToSubmit, setReadyToSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // New state to track submission

  const imageRef = useRef(null);
  const videoRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm();
  const caption = watch('caption', '');

  const centerAspectCrop = (mediaWidth, mediaHeight, aspect) => {
    return centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
      mediaWidth,
      mediaHeight
    );
  };

  const onMediaLoad = useCallback((e) => {
    if (isSubmitting) return; // Prevent toast after submission starts

    if (contentType === 'post') {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspectRatio));
      setReadyToSubmit(true);
    } else if (contentType === 'reel') {
      setIsVideoCropped(false);
      const video = e.target;
      const duration = video.duration;
      setVideoDuration(duration);
      setVideoEndTime(Math.min(duration, 60));
      if (duration > 60) {
        dispatch(showToast({ 
          message: "Video exceeds 60 seconds limit. Trim below (max 60s).", 
          type: 'warning' 
        }));
      }
      setReadyToSubmit(true);
    }
  }, [contentType, aspectRatio, dispatch, isSubmitting]);

  const handleMediaChange = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileType = file.type;
    const isVideo = fileType.startsWith('video/');
    
    if (isVideo && contentType !== 'reel') {
      setContentType('reel');
    } else if (!isVideo && contentType !== 'post') {
      setContentType('post');
    }

    if (contentType === 'post') {
      const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedImageTypes.includes(fileType)) {
        dispatch(showToast({
          message: "Image should be of type PNG, JPEG, JPG",
          type: 'error'
        }));
        e.target.value = '';
        return;
      }
    }

    if (contentType === 'reel') {
      const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
      if (!allowedVideoTypes.includes(fileType)) {
        dispatch(showToast({
          message: "Video should be of type MP4, MOV, WEBM, AVI",
          type: 'error'
        }));
        e.target.value = '';
        return;
      }
    }

    setSelectedFile(file);
    setPreviewMedia(URL.createObjectURL(file));
    setVideoDuration(0);
    setVideoStartTime(0);
    setVideoEndTime(60);
    setIsVideoCropped(false);
    setReadyToSubmit(false);
    setIsSubmitting(false); // Reset submission state
  }, [contentType, dispatch]);

  const changeAspectRatio = (ratio) => {
    setAspectRatio(ratio);
    if (imageRef.current) {
      const { width, height } = imageRef.current;
      setCrop(centerAspectCrop(width, height, ratio));
    }
  };

  const debounceCheck = useCallback(debounce(async (mention) => {
    if (!mention) {
      setIsMentionValid(null);
      return;
    }
    try {
      const result = await checkUserExists(mention);
      setIsMentionValid(result.exists);
      if (!result.exists) {
        dispatch(showToast({
          message: `User "${mention}" does not exist`,
          type: 'error'
        }));
      }
    } catch (error) {
      dispatch(showToast({
        message: "Error checking user existence. Please try again.",
        type: 'error'
      }));
      setIsMentionValid(false);
    }
  }, 300), [dispatch]);

  const handleMentionChange = (e) => {
    const value = e.target.value.replace(/\s+/g, '');
    setCurrentMention(value);
    debounceCheck(value);
  };

  const handleAddMention = () => {
    if (!currentMention || mentions.includes(currentMention) || !isMentionValid) return;
    setMentions([...mentions, currentMention]);
    setCurrentMention('');
    setIsMentionValid(null);
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
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.95);
    });
  };

  const updateVideoPlayback = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = videoStartTime;
    }
  }, [videoStartTime]);

  useEffect(() => {
    if (videoRef.current && contentType === 'reel' && !isSubmitting) {
      updateVideoPlayback();
    }
  }, [videoStartTime, contentType, updateVideoPlayback, isSubmitting]);

  const onSubmit = async (data) => {
    if (!readyToSubmit) {
      dispatch(showToast({
        message: "Please wait for video metadata to load before submitting.",
        type: 'warning'
      }));
      return;
    }

    setLoading(true);
    setIsSubmitting(true); // Mark submission start
    try {
      const formData = new FormData();
      formData.append('caption', data.caption);
      mentions.forEach(mention => formData.append('mentions', mention));
      hashtags.forEach(hashtag => formData.append('hashtags', hashtag));

      if (contentType === 'post' && completedCrop) {
        const croppedImage = await cropImage();
        if (croppedImage) {
          formData.append('file', croppedImage, 'cropped_image.jpg');
        } else {
          formData.append('file', selectedFile);
        }
      } else if (contentType === 'reel') {
        console.log("Submitting video with trim:", { start: videoStartTime, end: videoEndTime });
        formData.append('file', selectedFile);
        formData.append('videoStartTime', videoStartTime.toString());
        formData.append('videoEndTime', videoEndTime.toString());
      }

      const response = await createPost(formData);
      console.log(response.data.message);
      dispatch(showToast({ 
        message: `Your ${contentType} has been uploaded successfully!`, 
        type: 'success' 
      }));
      navigate('/home');
    } catch (error) {
      const errorResponse = error.response?.data;
      let errorMessage = "An unexpected error occurred";
      
      if (errorResponse) {
        if (errorResponse.detail && errorResponse.code === "token_not_valid") {
          errorMessage = "Your session has expired. Please log in again.";
        } else if (typeof errorResponse === 'string') {
          errorMessage = errorResponse;
        } else if (typeof errorResponse === 'object') {
          errorMessage = Object.entries(errorResponse)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(", ") : messages}`)
            .join("\n");
        }
        console.log("error creating post createcontent::", errorMessage);
        dispatch(showToast({ message: errorMessage, type: 'error' }));
      }
    } finally {
      setLoading(false);
      setIsSubmitting(false);
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
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setContentType('post')}
              className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 ${
                contentType === 'post' ? 'text-white bg-[#198754]/30' : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Image size={20} />
              <span>Post</span>
            </button>
            <button
              onClick={() => setContentType('reel')}
              className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 ${
                contentType === 'reel' ? 'text-white bg-[#FF6C37]/30' : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Film size={20} />
              <span>Reel</span>
            </button>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            <div className="flex justify-center">
              {!previewMedia ? (
                <div 
                  className="w-full h-64 border-2 border-dashed border-white/30 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#FF6C37] transition-colors duration-200"
                  onClick={() => document.getElementById('media-upload').click()}
                >
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
                        onLoadedMetadata={onMediaLoad}
                        className="max-w-full max-h-96 rounded-lg bg-black"
                      />
                      {videoDuration > 0 && !isSubmitting && (
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
                                    max={Math.max(0, videoDuration - 60)}
                                    step="0.1"
                                    value={videoStartTime}
                                    onChange={(e) => {
                                      const newStart = parseFloat(e.target.value);
                                      const newEnd = Math.min(videoDuration, newStart + 60);
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
                                    min={videoStartTime}
                                    max={videoDuration}
                                    step="0.1"
                                    value={videoEndTime}
                                    onChange={(e) => {
                                      const newEnd = parseFloat(e.target.value);
                                      if (newEnd - videoStartTime > 60) {
                                        setVideoStartTime(newEnd - 60);
                                      }
                                      setVideoEndTime(newEnd);
                                    }}
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
                      onClick={() => document.getElementById('media-upload').click()}
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
                        setVideoDuration(0);
                        setReadyToSubmit(false);
                        setIsSubmitting(false);
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
                accept={contentType === 'post' ? '.jpeg, .jpg, .png' : '.mp4, .mov, .avi, .webm'}
                onChange={handleMediaChange}
              />
            </div>
            <div>
              <textarea
                placeholder="Write a caption..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6C37] text-white placeholder-white/50 resize-none h-24"
                {...register('caption', {
                  required: 'Caption is required',
                  maxLength: { value: 2200, message: 'Caption cannot exceed 2200 characters' }
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
            <div>
              <div className="flex">
                <input
                  type="text"
                  value={currentMention}
                  onChange={handleMentionChange}
                  placeholder="Mention people..."
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-[#FF6C37] text-white placeholder-white/50"
                />
                <button
                  type="button"
                  onClick={handleAddMention}
                  disabled={!isMentionValid}
                  className={`px-4 py-3 text-white rounded-r-xl flex items-center ${
                    isMentionValid ? 'bg-[#FF6C37]/50 hover:bg-[#FF6C37]/70' : 'bg-gray-500/50 cursor-not-allowed'
                  }`}
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
            <div className="pt-4 border-t border-white/10">
              <button
                type="submit"
                disabled={!selectedFile || !readyToSubmit}
                className={`w-full py-3 px-6 ${
                  selectedFile && readyToSubmit
                    ? 'bg-[#1E3932] hover:bg-[#198754] transform hover:scale-105'
                    : 'bg-gray-500 cursor-not-allowed'
                } text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6C37] focus:ring-offset-2 focus:ring-offset-[#1E3932] transition-all duration-200 flex items-center justify-center group relative overflow-hidden`}
              >
                <span className="relative z-10 flex items-center">
                  Share {contentType === 'post' ? 'Post' : 'Reel'}
                  <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className={`absolute inset-0 ${selectedFile && readyToSubmit ? 'bg-gradient-to-r from-[#198754] to-[#1E3932] opacity-0 group-hover:opacity-100' : ''} transition-opacity duration-300`}></div>
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