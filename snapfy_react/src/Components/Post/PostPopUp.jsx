import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Smile, X, Bookmark, Send, MoreHorizontal, ChevronRight, ChevronLeft, Edit, Trash, Archive, ConeIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSelector } from 'react-redux';
import { CLOUDINARY_ENDPOINT } from '../../APIEndPoints';
import { useNavigate } from 'react-router-dom';

const PostPopup = ({ post, userData, isOpen, onClose }) => {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [comment, setComment] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [mentionedUsers, setMentionedUsers] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const commentInputRef = useRef(null);
  const popupRef = useRef(null);
  const menuRef = useRef(null);
  const confirmationRef = useRef(null);
  const videoRef = useRef(null);
  const {user} = useSelector(state=> state.user)
  const navigate = useNavigate() 
  const currentUser = user

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
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutsideMenu = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutsideMenu);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideMenu);
    };
  }, [showMenu]);
  
  // Handle clicks outside delete confirmation dialog
  useEffect(() => {
    const handleClickOutsideConfirmation = (event) => {
      if (confirmationRef.current && !confirmationRef.current.contains(event.target)) {
        setShowDeleteConfirmation(false);
      }
    };
    
    if (showDeleteConfirmation) {
      document.addEventListener('mousedown', handleClickOutsideConfirmation);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideConfirmation);
    };
  }, [showDeleteConfirmation]);
  
  // Focus comment input when replying
  useEffect(() => {
    if (replyTo && commentInputRef.current) {
      commentInputRef.current.focus();
    }
  }, [replyTo]);
  
  // Extract mentioned users from post caption and comments
  useEffect(() => {
    if (post) {
      const mentions = [];
      
      // Extract from mentions array
      if (post.mentions && post.mentions.length > 0) {
        post.mentions.forEach(mention => {
          if (!mentions.includes(mention.username)) {
            mentions.push(mention.username);
          }
        });
      }
      
      // Extract from comments
      if (post.comments) {
        post.comments.forEach(comment => {
          const commentMentions = comment.text.match(/@(\w+)/g) || [];
          commentMentions.forEach(mention => {
            const username = mention.substring(1);
            if (!mentions.includes(username)) {
              mentions.push(username);
            }
          });
        });
      }
      
      setMentionedUsers(mentions);
    }
  }, [post]);
  
  if (!isOpen || !post) return null;
  
  // Log video duration on load
  const handleVideoLoaded = (e) => {
    console.log("Video duration loaded:", e.target.duration);
  };

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
  
  const handleEditPost = () => {
    console.log("Edit post:", post.id);
    setShowMenu(false);
    // navigating to edit-post
    navigate(`/edit-post/${post.id}?username=${currentUser.username}`);
  };
  
  const handleDeletePost = () => {
    setShowMenu(false);
    setShowDeleteConfirmation(true);
  };

  const confirmDeletePost = () => {
    console.log("Confirmed: Delete post:", post.id);
    setShowDeleteConfirmation(false);
    // Actual delete functionality would go here
    // After successful deletion, you might want to close the popup
    // onClose();
  };
  
  const cancelDeletePost = () => {
    setShowDeleteConfirmation(false);
  };
  
  const handleArchivePost = () => {
    console.log("Archive post:", post.id);
    setShowMenu(false);
    // archive functionality 
  };
  
  const toggleMentionedUsers = () => {
    setShowMentions(!showMentions);
  };
  
  // Format hashtags and mentions in text
  const formatText = (text) => {
    if (!text) return '';
    
    // Get hashtags and mentions from post
    const hashtags = post.hashtags || [];
    const mentions = post.mentions || [];
    
    // Split the text into parts to handle hashtags and mentions
    const parts = [];
    let lastIndex = 0;
    
    // Find hashtags
    const hashtagRegex = /#(\w+)/g;
    let hashMatch;
    while ((hashMatch = hashtagRegex.exec(text)) !== null) {
      // Add text before the hashtag
      if (hashMatch.index > lastIndex) {
        parts.push({ type: 'text', content: text.substring(lastIndex, hashMatch.index) });
      }
      
      // Add the hashtag
      parts.push({ type: 'hashtag', content: hashMatch[0], tag: hashMatch[1] });
      
      lastIndex = hashMatch.index + hashMatch[0].length;
    }
    
    // Process the resulting string for mentions
    let processedText = lastIndex < text.length ? text.substring(lastIndex) : '';
    if (parts.length === 0) {
      processedText = text;
    }
    
    const mentionRegex = /@(\w+)/g;
    let mentionMatch;
    let mentionLastIndex = 0;
    const mentionParts = [];
    
    while ((mentionMatch = mentionRegex.exec(processedText)) !== null) {
      // Add text before the mention
      if (mentionMatch.index > mentionLastIndex) {
        mentionParts.push({ type: 'text', content: processedText.substring(mentionLastIndex, mentionMatch.index) });
      }
      
      // Add the mention
      mentionParts.push({ type: 'mention', content: mentionMatch[0], user: mentionMatch[1] });
      
      mentionLastIndex = mentionMatch.index + mentionMatch[0].length;
    }
    
    // Add any remaining text
    if (mentionLastIndex < processedText.length) {
      mentionParts.push({ type: 'text', content: processedText.substring(mentionLastIndex) });
    }
    
    // If we processed mentions, add them to parts
    if (mentionParts.length > 0) {
      parts.push(...mentionParts);
    } else if (processedText.length > 0) {
      parts.push({ type: 'text', content: processedText });
    }

    // If we have explicit hashtags or mentions from the post data, add them
    if (hashtags.length > 0 || mentions.length > 0) {
      // Create a formatted caption with explicit hashtags and mentions
      let formattedText = text;
      
      // Add hashtags at the end
      hashtags.forEach(hashtag => {
        if (!formattedText.includes(`#${hashtag.name}`)) {
          formattedText += ` #${hashtag.name}`;
          parts.push({ type: 'hashtag', content: `#${hashtag.name}`, tag: hashtag.name });
        }
      });
      
      // Add mentions at the end
      mentions.forEach(mention => {
        if (!formattedText.includes(`@${mention.username}`)) {
          formattedText += ` @${mention.username}`;
          parts.push({ type: 'mention', content: `@${mention.username}`, user: mention.username });
        }
      });
    }
    
    // Render the parts
    return (
      <>
        {parts.map((part, index) => {
          if (part.type === 'hashtag') {
            return <span key={index} className="text-blue-500 font-medium cursor-pointer hover:underline">{part.content}</span>;
          } else if (part.type === 'mention') {
            return <span key={index} className="text-blue-500 font-medium cursor-pointer hover:underline">{part.content}</span>;
          } else {
            return <span key={index}>{part.content}</span>;
          }
        })}
      </>
    );
  };
  
  // Check if current user is the post owner
  const isPostOwner = currentUser && currentUser.username === userData?.username;
  
  // Dummy emojis - in a real app, use an emoji picker library
  const emojis = ['😊', '❤️', '👍', '🔥', '😂', '😍', '🙌', '👏'];
  
  // Sample comments (replace with real data from post)
  const comments = post?.comments || [
    { id: 1, username: 'user1', text: 'Love this! #amazing', likes: 24, timestamp: new Date(Date.now() - 3600000) },
    { id: 2, username: 'user2', text: 'Great shot @user1 👏', likes: 5, timestamp: new Date(Date.now() - 7200000) },
    { id: 3, username: 'user3', text: 'Where is this? Looks wonderful!', likes: 2, timestamp: new Date(Date.now() - 86400000) }
  ];



  const handleVideoError = (e) => {
    console.log("Video load error:", e);
    console.log("Attempted URL:", videoRef.current?.src);
  };

  
  const isVideo = post?.file?.includes('/video/upload/');
  
  // Format caption to include hashtags and mentions explicitly
  const getFormattedCaption = () => {
    let caption = post?.caption || '';
    
    // Add hashtags if they're not already in the caption
    if (post?.hashtags && post.hashtags.length > 0) {
      post.hashtags.forEach(hashtag => {
        if (!caption.includes(`#${hashtag.name}`)) {
          caption += ` #${hashtag.name}`;
        }
      });
    }
    
    // Add mentions if they're not already in the caption
    if (post?.mentions && post.mentions.length > 0) {
      post.mentions.forEach(mention => {
        if (!caption.includes(`@${mention.username}`)) {
          caption += ` @${mention.username}`;
        }
      });
    }
    
    return caption;
  };

  const normalizeUrl = (url) => {
    return url.replace(/^(auto\/upload\/)+/, '');
  };

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
                ref={videoRef}
                src={normalizeUrl(post?.file)} // Normalize URL here
                className="max-h-[90vh] max-w-full object-contain"
                controls
                autoPlay={false}
                onLoadedMetadata={handleVideoLoaded}
                onError={handleVideoError}
                />
                ) : (
                <img 
                src={normalizeUrl(post?.file)}
                alt="Post"
                className="max-h-[90vh] max-w-full object-contain"
                />
            )}
          
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
                src={userData?.profileImage} 
                alt={userData?.username}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-grow">
              <span className="font-bold text-sm">{userData?.username}</span>
            </div>
            <div className="relative">
              <button 
                className="ml-2"
                onClick={() => setShowMenu(!showMenu)}
              >
                <MoreHorizontal size={20} />
              </button>
              
              {/* Options menu */}
              {showMenu && (
                <div 
                  ref={menuRef}
                  className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 z-10 w-32"
                >
                  {isPostOwner && (
                    <>
                      <button 
                        onClick={handleEditPost}
                        className="flex items-center w-full p-2 hover:bg-gray-100 text-left"
                      >
                        <Edit size={16} className="mr-2" />
                        <span>Edit Post</span>
                      </button>
                      <button 
                        onClick={handleDeletePost}
                        className="flex items-center w-full p-2 hover:bg-gray-100 text-red-500 text-left"
                      >
                        <Trash size={16} className="mr-2" />
                        <span>Delete Post</span>
                      </button>
                      <button 
                        onClick={handleArchivePost}
                        className="flex items-center w-full p-2 hover:bg-gray-100 text-red-500 text-left"
                      >
                        <Archive size={16} className="mr-2" />
                        <span>Archive Post</span>
                      </button>
                    </>
                  )}
                  {mentionedUsers.length > 0 && (
                    <button 
                      onClick={toggleMentionedUsers}
                      className="flex items-center w-full p-2 hover:bg-gray-100 text-left"
                    >
                      <MessageCircle size={16} className="mr-2" />
                      <span>Mentioned Users</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Mentioned users panel */}
          {showMentions && (
            <div className="p-3 bg-gray-50 border-b">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-sm">Mentioned Users</h3>
                <button onClick={() => setShowMentions(false)}>
                  <X size={16} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {mentionedUsers.map((username, index) => (
                  <span key={index} className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-sm">
                    @{username}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Caption and comments */}
          <div className="flex-grow overflow-y-auto p-4">
            {/* Original post caption */}
            {post?.caption && (
              <div className="flex mb-4">
                <div className="w-8 h-8 rounded-full overflow-hidden mr-3 flex-shrink-0">
                  <img 
                    src={userData?.profileImage} 
                    alt={userData?.username}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p>
                    <span className="font-bold text-sm mr-2">{userData?.username}</span>
                    {formatText(getFormattedCaption())}
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
              {formatDistanceToNow(new Date(post?.created_at || Date.now()), { addSuffix: true })}
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

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-transparent bg-opacity-50 z-50 flex items-center justify-center">
          <div 
            ref={confirmationRef}
            className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl border-2 border-[#198754]"
          >
            <h3 className="text-lg font-bold mb-4">Delete Post</h3>
            <p className="mb-6">Are you sure you want to delete this post?</p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={cancelDeletePost}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                No
              </button>
              <button 
                onClick={confirmDeletePost}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostPopup;