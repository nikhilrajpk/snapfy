import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Smile, X, Bookmark, Send, MoreHorizontal, ChevronRight, ChevronLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';


const PostPopup = ({ post, userData, isOpen, onClose, currentUser }) => {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [comment, setComment] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const commentInputRef = useRef(null);
  const popupRef = useRef(null);
  
  console.log("userData ::", userData)

  // Detect clicks outside to close popup
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent scrolling on body when popup is open
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);
  
  // Focus comment input when replying
  useEffect(() => {
    if (replyTo && commentInputRef.current) {
      commentInputRef.current.focus();
    }
  }, [replyTo]);
  
  if (!isOpen || !post) return null;
  
  const handleLike = () => setLiked(!liked);
  const handleSave = () => setSaved(!saved);
  
  const handleCommentSubmit = (e) => {
    e.preventDefault();
    //  send the comment to backend
    console.log(`Submitting comment: ${comment}${replyTo ? ` as reply to ${replyTo.username}` : ''}`);
    setComment('');
    setReplyTo(null);
  };
  
  const handleReply = (username) => {
    setReplyTo({ username });
    setComment(`@${username} `);
  };
  
  // Format hashtags and mentions in text
  const formatText = (text) => {
    if (!text) return '';
    
    // Replacing hashtags with colored spans
    const hashtagged = text.replace(/#(\w+)/g, '<span class="text-blue-500 font-medium">#$asdlflk</span>');
    
    // Replacing mentions with colored spans
    const mentioned = hashtagged.replace(/@(\w+)/g, '<span class="text-blue-500 font-medium">@$1</span>');
    
    return <span dangerouslySetInnerHTML={{ __html: mentioned }} />;
  };
  
  // Dummy emojis - in a real app, use an emoji picker library
  const emojis = ['😊', '❤️', '👍', '🔥', '😂', '😍', '🙌', '👏'];
  
  // Sample comments (replace with real data from post)
  const comments = post?.comments || [
    { id: 1, username: 'user1', text: 'Love this! #amazing', likes: 24, timestamp: new Date(Date.now() - 3600000) },
    { id: 2, username: 'user2', text: 'Great shot @user1 👏', likes: 5, timestamp: new Date(Date.now() - 7200000) },
    { id: 3, username: 'user3', text: 'Where is this? Looks wonderful!', likes: 2, timestamp: new Date(Date.now() - 86400000) }
  ];
  
  const isVideo = post?.file?.includes('/video/upload/');
  
  return (
    <div className="fixed inset-0 bg-transparent bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div 
        ref={popupRef}
        className="bg-white rounded-xl border-2 border-[#198754] overflow-hidden max-w-6xl w-full max-h-[90vh] flex flex-col md:flex-row shadow-2xl"
      >
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 z-999 right-4 bg-[#198754] rounded-full p-1"
        >
          <X size={24} color='white' />
        </button>
        
        {/* Media section - left side */}
        <div className="relative w-full md:w-7/12 bg-black flex items-center justify-center">
          {isVideo ? (
            <video 
              src={post?.file.replace('auto/upload/', '')}
              className="max-h-[90vh] max-w-full object-contain"
              controls
              autoPlay={false}
            />
          ) : (
            <img 
              src={post?.file.replace('auto/upload/','')}
              alt="Post"
              className="max-h-[90vh] max-w-full object-contain"
            />
          )}
          
          {/* Navigation arrows for multiple media */}
          {post?.hasMultipleMedia && (
            <>
              <button className="absolute left-2 bg-white bg-opacity-70 rounded-full p-2 hover:bg-opacity-100 transition">
                <ChevronLeft size={24} />
              </button>
              <button className="absolute right-2 bg-white bg-opacity-70 rounded-full p-2 hover:bg-opacity-100 transition">
                <ChevronRight size={24} />
              </button>
            </>
          )}
        </div>
        
        {/* Content section - right side */}
        <div className="w-full md:w-5/12 flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center p-4 border-b">
            <div className="w-8 h-8 rounded-full overflow-hidden mr-3">
              <img 
                src={userData?.profileImage || '/default-profile.png'} 
                alt={userData?.username}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-grow">
              <span className="font-bold text-sm">{userData?.username}</span>
            </div>
            <button className="ml-2">
              <MoreHorizontal size={20} />
            </button>
          </div>
          
          {/* Caption and comments */}
          <div className="flex-grow overflow-y-auto p-4">
            {/* Original post caption */}
            {post?.caption && (
              <div className="flex mb-4">
                <div className="w-8 h-8 rounded-full overflow-hidden mr-3 flex-shrink-0">
                  <img 
                    src={userData?.profileImage || '/default-profile.png'} 
                    alt={userData?.username}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p>
                    <span className="font-bold text-sm mr-2">{userData?.username}</span>
                    {formatText(post?.caption)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(post?.created_at || Date.now()), { addSuffix: true })}
                  </p>
                </div>
              </div>
            )}
            
            {/* Comments */}
            <div className="space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="flex group">
                  <div className="w-8 h-8 rounded-full overflow-hidden mr-3 flex-shrink-0">
                    <img 
                      src={`/default-profile.png`} 
                      alt={comment.username}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-grow">
                    <p>
                      <span className="font-bold text-sm mr-2">{comment.username}</span>
                      {formatText(comment.text)}
                    </p>
                    <div className="flex items-center mt-1 text-xs text-gray-500">
                      <span>{formatDistanceToNow(comment.timestamp, { addSuffix: true })}</span>
                      {comment.likes > 0 && <span className="mx-2">{comment.likes} likes</span>}
                      <button 
                        className="mx-2 font-medium"
                        onClick={() => handleReply(comment.username)}
                      >
                        Reply
                      </button>
                      <button className="opacity-0 group-hover:opacity-100">
                        <Heart size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="border-t p-4">
            <div className="flex justify-between mb-2">
              <div className="flex space-x-4">
                <button onClick={handleLike}>
                  <Heart size={24} className={`${liked ? 'fill-red-500 text-red-500' : ''} transition-transform hover:scale-110`} />
                </button>
                <button onClick={() => commentInputRef.current.focus()}>
                  <MessageCircle size={24} className="transition-transform hover:scale-110" />
                </button>
                <button>
                  <Send size={24} className="transition-transform hover:scale-110" />
                </button>
              </div>
              <button onClick={handleSave}>
                <Bookmark size={24} className={`${saved ? 'fill-black' : ''} transition-transform hover:scale-110`} />
              </button>
            </div>
            
            {/* Like count */}
            <p className="font-bold text-sm mb-1">{post?.likes || 0} likes</p>
            
            {/* Timestamp */}
            <p className="text-xs text-gray-500 uppercase mb-3">
              {formatDistanceToNow(new Date(post?.timestamp || Date.now()), { addSuffix: true })}
            </p>
            
            {/* Reply to indicator */}
            {replyTo && (
              <div className="bg-gray-100 p-2 rounded-lg flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">
                  Replying to <span className="font-medium">@{replyTo.username}</span>
                </span>
                <button onClick={() => setReplyTo(null)}>
                  <X size={16} />
                </button>
              </div>
            )}
            
            {/* Comment form */}
            <form onSubmit={handleCommentSubmit} className="flex items-center">
              <button 
                type="button" 
                className="mr-2"
                onClick={() => setShowEmojis(!showEmojis)}
              >
                <Smile size={24} className="text-gray-600" />
              </button>
              
              <input
                ref={commentInputRef}
                type="text"
                placeholder="Add a comment..."
                className="flex-grow py-2 focus:outline-none"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              
              <button 
                type="submit" 
                className={`font-semibold text-blue-500 ${!comment.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:text-blue-700'}`}
                disabled={!comment.trim()}
              >
                Post
              </button>
            </form>
            
            {/* Emoji picker */}
            {showEmojis && (
              <div className="absolute bottom-16 left-0 bg-white p-2 rounded-lg shadow-lg border flex space-x-2">
                {emojis.map(emoji => (
                  <button 
                    key={emoji} 
                    className="text-xl hover:bg-gray-100 p-1 rounded"
                    onClick={() => {
                      setComment(prev => prev + emoji);
                      commentInputRef.current.focus();
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


export default PostPopup