import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Smile, X, Bookmark, Send, MoreHorizontal, ChevronRight, ChevronLeft, Edit, Trash, Archive } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { showToast } from '../../redux/slices/toastSlice';
import { deletePost, savePost, isSavedPost, removeSavedPost, archivePost, removeArchivedPost, isArchivedPost, likePost, addComment, addCommentReply, getLikeCount, isLikedPost } from '../../API/postAPI';
import axiosInstance from '../../axiosInstance';
import { CLOUDINARY_ENDPOINT } from '../../APIEndPoints';
import { useQueryClient } from '@tanstack/react-query';

const PostPopup = ({ post, userData, isOpen, onClose, onPostDeleted = null, onSaveChange = null }) => {
  const [liked, setLiked] = useState(post?.is_liked || false);
  const [likeCount, setLikeCount] = useState(post?.likes || 0);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState(post?.comments || []);
  const [showEmojis, setShowEmojis] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [mentionedUsers, setMentionedUsers] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedPostId, setSavedPostId] = useState(null);
  const [archived, setArchived] = useState(false);
  const [archivedPostId, setArchivedPostId] = useState(null);
  const [shouldRefetch, setShouldRefetch] = useState(false);
  const [showLikedUsers, setShowLikedUsers] = useState(false);
  const [likedUsers, setLikedUsers] = useState([]);

  const commentInputRef = useRef(null);
  const popupRef = useRef(null);
  const menuRef = useRef(null);
  const confirmationRef = useRef(null);
  const videoRef = useRef(null);
  const { user } = useSelector(state => state.user);
  const currentUser = user;
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  // Detect clicks outside to close popup
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target) && 
          !confirmationRef.current?.contains(event.target) && 
          !menuRef.current?.contains(event.target)) {
        onClose();
        setShowLikedUsers(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
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

  // Handle clicks outside delete confirmation
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

  // Extract mentioned users
  useEffect(() => {
    if (post) {
      const mentions = [];
      if (post.mentions && post.mentions.length > 0) {
        post.mentions.forEach(mention => {
          if (!mentions.includes(mention.username)) {
            mentions.push(mention.username);
          }
        });
      }
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

  // Check saved status
  useEffect(() => {
    let isMounted = true;

    const checkIfPostIsSaved = async () => {
      if (!post?.id || !user?.id) return;
      try {
        const response = await isSavedPost({ post: post.id, user: user.id });
        if (isMounted && response.exists !== saved) {
          setSaved(response.exists || false);
          setSavedPostId(response.savedPostId || null);
        }
      } catch (error) {
        console.error('Error checking if post is saved:', error);
        if (isMounted) {
          setSaved(false);
          setSavedPostId(null);
        }
      }
    };

    if (isOpen) checkIfPostIsSaved();

    return () => { isMounted = false; };
  }, [isOpen, post?.id, user?.id, saved]);

  // Check archived status
  useEffect(() => {
    let isMounted = true;
    const checkIfPostIsArchived = async () => {
      if (!post?.id || !user?.id) return;
      try {
        const response = await isArchivedPost({ post: post.id, user: user.id });
        if (isMounted && response.exists !== archived) {
          setArchived(response.exists || false);
          setArchivedPostId(response.savedPostId || null);
        }
      } catch (error) {
        console.error('Error checking if post is archived:', error);
        if (isMounted) {
          setArchived(false);
          setArchivedPostId(null);
        }
      }
    };
    if (isOpen) checkIfPostIsArchived();
    return () => { isMounted = false; };
  }, [isOpen, post?.id, user?.id, archived]);

  // Fetch comments, like count, and like status
  useEffect(() => {
    console.log('useEffect triggered with isOpen:', isOpen, 'postId:', post?.id, 'userId:', user?.id);
    let isMounted = true;
    
    const fetchData = async () => {
      if (!post?.id || !user?.id) return;
  
      try {
        const [commentsResponse, likeCountResponse, isLikedResponse] = await Promise.all([
          axiosInstance.get(`/posts/${post.id}/comments/`),
          getLikeCount(post.id),
          isLikedPost({ post: post.id, user: user.id })
        ]);
  
        if (isMounted) {
          setComments(commentsResponse.data);
          setLikeCount(likeCountResponse.likes || post?.likes || 0);
          setLiked(isLikedResponse.exists || false);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        if (isMounted && !comments.length && likeCount === 0 && !liked) {
          // Only set fallback values if no data exists yet
          setComments(post?.comments || []);
          setLikeCount(post?.likes || 0);
          setLiked(post?.is_liked || false);
        }
      }
    };
  
    if (isOpen) {
      fetchData();
    }
  
    return () => {
      isMounted = false;
    };
  }, [isOpen, post?.id, user?.id]);

  if (!isOpen || !post) return null;

  const handleSave = async () => {
    if (!saved) {
      setSaved(true);
      try {
        const response = await savePost({ post: post?.id });
        setSavedPostId(response.id);
        dispatch(showToast({ message: `Post "${post?.caption}" saved successfully`, type: 'success' }));
        setShouldRefetch(true);
      } catch (error) {
        console.error('Error saving post:', error);
        setSaved(false);
        dispatch(showToast({ message: 'Error saving post', type: 'error' }));
      }
    } else {
      setSaved(false);
      if (!savedPostId) {
        console.error('No SavedPost ID available to remove');
        dispatch(showToast({ message: 'Error: Saved post ID not found', type: 'error' }));
        return;
      }
      try {
        const response = await removeSavedPost(savedPostId);
        setSavedPostId(null);
        dispatch(showToast({ message: response.message || "Post removed from save list", type: 'success' }));
        setShouldRefetch(true);
      } catch (error) {
        console.error('Error removing post from save list:', error);
        setSaved(true);
        dispatch(showToast({ message: 'Error removing post from saved list', type: 'error' }));
      }
    }
  };

  const handleArchivePost = async () => {
    setShowMenu(false);
    if (!archived) {
      setArchived(true);
      try {
        const response = await archivePost({ post: post?.id, user: user.id });
        setArchivedPostId(response.id);
        dispatch(showToast({ message: `Post "${post?.caption}" archived successfully`, type: 'success' }));
        setShouldRefetch(true);
      } catch (error) {
        console.error('Error archiving post:', error);
        setArchived(false);
        dispatch(showToast({ message: 'Error archiving post', type: 'error' }));
      }
    } else {
      setArchived(false);
      if (!archivedPostId) {
        console.error('No ArchivedPost ID available to remove');
        dispatch(showToast({ message: 'Error: Archived post ID not found', type: 'error' }));
        return;
      }
      try {
        const response = await removeArchivedPost(archivedPostId);
        setArchivedPostId(null);
        dispatch(showToast({ message: response.message || "Post removed from archive", type: 'success' }));
        setShouldRefetch(true);
        queryClient.invalidateQueries({ queryKey: ['explore-posts'] });
      } catch (error) {
        console.error('Error removing post from archive:', error);
        setArchived(true);
        dispatch(showToast({ message: 'Error removing post from archive', type: 'error' }));
      }
    }
  };

  const handleClose = () => {
    if (shouldRefetch && onSaveChange) {
      onSaveChange();
    }
    setShouldRefetch(false);
    setShowLikedUsers(false);
    onClose();
  };

  const handleLike = async () => {
    try {
      const response = await likePost(post.id);
      setLiked(response.is_liked);
      setLikeCount(response.likes);
      dispatch(showToast({ message: response.message, type: 'success' }));
      queryClient.invalidateQueries(['posts', post.id]);
    } catch (error) {
      console.error('Error liking post:', error);
      dispatch(showToast({ message: 'Error liking post', type: 'error' }));
    }
  };

  const handleLikeCountClick = async () => {
    if (showLikedUsers) {
      setShowLikedUsers(false);
      return;
    }
    try {
      const response = await axiosInstance.get(`/posts/${post.id}/liked_users/`);
      setLikedUsers(response.data);
      setShowLikedUsers(true);
    } catch (error) {
      console.error('Error fetching liked users:', error);
      dispatch(showToast({ message: 'Error fetching liked users', type: 'error' }));
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    try {
      if (replyTo) {
        const replyData = { post: post.id, comment: replyTo.id, text: comment };
        const newReply = await addCommentReply(replyData);
        setComments(prev =>
          prev.map(c =>
            c.id === replyTo.id ? { ...c, replies: [...(c.replies || []), newReply] } : c
          )
        );
        dispatch(showToast({ message: 'Reply added', type: 'success' }));
      } else {
        const commentData = { post: post.id, text: comment };
        const newComment = await addComment(commentData);
        setComments(prev => [...prev, newComment]);
        dispatch(showToast({ message: 'Comment added', type: 'success' }));
      }
      setComment('');
      setReplyTo(null);
      queryClient.invalidateQueries(['posts', post.id]);
    } catch (error) {
      console.error('Error adding comment/reply:', error);
      dispatch(showToast({ message: 'Error adding comment/reply', type: 'error' }));
    }
  };

  const handleReply = (comment) => {
    setReplyTo(comment);
    setComment(`@${comment.username || comment.user} `);
  };

  const handleEditPost = () => {
    setShowMenu(false);
    navigate(`/edit-post/${post.id}?username=${currentUser.username}`);
  };

  const handleDeletePost = () => {
    setShowMenu(false);
    setShowDeleteConfirmation(true);
  };

  const confirmDeletePost = async (e) => {
    e.stopPropagation();
    try {
      await deletePost(post?.id);
      setShowDeleteConfirmation(false);
      onClose();
      if (onPostDeleted) onPostDeleted(post.id);
      dispatch(showToast({ message: "Post deleted successfully", type: "success" }));
      navigate(`/${currentUser.username}`);
    } catch (error) {
      console.error("Error deleting post:", error);
      dispatch(showToast({ message: "Failed to delete post", type: "error" }));
      setShowDeleteConfirmation(false);
    }
  };

  const cancelDeletePost = (e) => {
    e.stopPropagation();
    setShowDeleteConfirmation(false);
  };

  const toggleMentionedUsers = () => {
    setShowMentions(!showMentions);
  };

  const formatText = (text) => {
    if (!text) return '';

    const hashtags = post.hashtags || [];
    const mentions = post.mentions || [];

    const parts = [];
    let lastIndex = 0;

    const hashtagRegex = /#(\w+)/g;
    let hashMatch;
    while ((hashMatch = hashtagRegex.exec(text)) !== null) {
      if (hashMatch.index > lastIndex) {
        parts.push({ type: 'text', content: text.substring(lastIndex, hashMatch.index) });
      }
      parts.push({ type: 'hashtag', content: hashMatch[0], tag: hashMatch[1] });
      lastIndex = hashMatch.index + hashMatch[0].length;
    }

    let processedText = lastIndex < text.length ? text.substring(lastIndex) : '';
    if (parts.length === 0) processedText = text;

    const mentionRegex = /@(\w+)/g;
    let mentionMatch;
    let mentionLastIndex = 0;
    const mentionParts = [];

    while ((mentionMatch = mentionRegex.exec(processedText)) !== null) {
      if (mentionMatch.index > mentionLastIndex) {
        mentionParts.push({ type: 'text', content: processedText.substring(mentionLastIndex, mentionMatch.index) });
      }
      mentionParts.push({ type: 'mention', content: mentionMatch[0], user: mentionMatch[1] });
      mentionLastIndex = mentionMatch.index + mentionMatch[0].length;
    }

    if (mentionLastIndex < processedText.length) {
      mentionParts.push({ type: 'text', content: processedText.substring(mentionLastIndex) });
    }

    if (mentionParts.length > 0) parts.push(...mentionParts);
    else if (processedText.length > 0) parts.push({ type: 'text', content: processedText });

    if (hashtags.length > 0 || mentions.length > 0) {
      hashtags.forEach(hashtag => {
        if (!text.includes(`#${hashtag.name}`)) {
          parts.push({ type: 'hashtag', content: `#${hashtag.name}`, tag: hashtag.name });
        }
      });
      mentions.forEach(mention => {
        if (!text.includes(`@${mention.username}`)) {
          parts.push({ type: 'mention', content: `@${mention.username}`, user: mention.username });
        }
      });
    }

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

  const isPostOwner = currentUser && currentUser.username === post?.user?.username;
  const isVideo = post?.file?.includes('/video/upload/');
  const normalizeUrl = (url) => url ? url.replace(/^(auto\/upload\/)+/, '') : '/default-post.png';

  return (
    <div className="fixed inset-0 bg-transparent bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div 
        ref={popupRef}
        className="bg-white rounded-xl border-2 border-[#198754] overflow-hidden max-w-6xl w-full max-h-[90vh] flex flex-col md:flex-row shadow-2xl"
      >
        <button 
          onClick={handleClose}
          className="absolute top-4 z-999 right-4 bg-[#198754] rounded-full p-1"
        >
          <X size={24} color='white' />
        </button>
        
        <div className="relative w-full md:w-7/12 bg-black flex items-center justify-center">
          {isVideo ? (
            <video 
              ref={videoRef}
              src={normalizeUrl(post?.file)}
              className="max-h-[90vh] max-w-full object-contain"
              controls
              autoPlay={false}
              onLoadedMetadata={e => console.log("Video duration loaded:", e.target.duration)}
              onError={e => console.log("Video load error:", e)}
            />
          ) : (
            <img 
              src={normalizeUrl(post?.file)}
              alt="Post"
              className="max-h-[90vh] h-full max-w-full object-contain"
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
        
        <div className="w-full md:w-5/12 flex flex-col max-h-[90vh]">
          <div className="flex items-center p-4 border-b">
            <div className="w-8 h-8 rounded-full overflow-hidden mr-3">
              <img 
                src={`${CLOUDINARY_ENDPOINT}${post?.user?.profile_picture}` || '/default-profile.png'} 
                alt={post?.user?.username || 'Unknown'}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-grow cursor-pointer" onClick={() => navigate(`/user/${post?.user?.username}`)}>
              <span className="font-bold text-sm">{post?.user?.username || 'Unknown'}</span>
            </div>
            <div className="relative">
              <button 
                className="ml-2"
                onClick={() => setShowMenu(!showMenu)}
              >
                <MoreHorizontal size={20} />
              </button>
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
                      <button onClick={handleArchivePost} className="flex items-center w-full p-2 hover:bg-gray-100 text-gray-700 text-left">
                        <Archive size={16} className="mr-2" />
                        <span>{archived ? 'Unarchive' : 'Archive'} Post</span>
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
                  <span key={index} className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-sm" onClick={() => navigate(`/user/${username}`)}>
                    @{username}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex-grow overflow-y-auto p-4">
            {post?.caption && (
              <div className="flex mb-4">
                <div className="w-8 h-8 rounded-full overflow-hidden mr-3 flex-shrink-0">
                  <img 
                    src={`${CLOUDINARY_ENDPOINT}${post?.user?.profile_picture}` || '/default-profile.png'} 
                    alt={post?.user?.username || 'Unknown'}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p>
                    <span className="font-bold text-sm mr-2">{post?.user?.username || 'Unknown'}</span>
                    {formatText(post?.caption)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {post?.created_at
                      ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true })
                      : 'Just now'}
                  </p>
                </div>
              </div>
            )}
            <div className="space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="flex group">
                  <div className="w-8 h-8 rounded-full overflow-hidden mr-3 flex-shrink-0">
                    <img 
                      src={`${CLOUDINARY_ENDPOINT}${comment.profile_picture}` || '/default-profile.png'} 
                      alt={comment.username || 'Unknown'} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="flex-grow">
                  <p>
                    <span className="font-bold text-sm mr-2">{comment.username || 'Unknown'}</span>
                    {comment.text} {/* Use raw text instead of formatText */}
                  </p>
                    <div className="flex items-center mt-1 text-xs text-gray-500">
                      <span>
                        {comment.created_at
                          ? formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })
                          : 'Just now'}
                      </span>
                      {comment.likes > 0 && <span className="mx-2">{comment.likes} likes</span>}
                      <button 
                        onClick={() => handleReply(comment)} 
                        className="mx-2 font-medium"
                      >
                        Reply
                      </button>
                      <button className="opacity-0 group-hover:opacity-100">
                        <Heart size={12} />
                      </button>
                    </div>
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="ml-8 mt-2 space-y-2">
                        {comment.replies.map(reply => (
                          <div key={reply.id} className="flex">
                            <div className="w-6 h-6 rounded-full overflow-hidden mr-2 flex-shrink-0">
                              <img 
                                src={`${CLOUDINARY_ENDPOINT}${reply.profile_picture}` || '/default-profile.png'} 
                                alt={reply.user || 'Unknown'} 
                                className="w-full h-full object-cover" 
                              />
                            </div>
                            <div>
                            <p>
                              <span className="font-bold text-xs mr-2">{reply.user || 'Unknown'}</span>
                              {reply.text} {/* Use raw text instead of formatText */}
                            </p>
                              <p className="text-xs text-gray-500">
                                {reply.created_at ? formatDistanceToNow(new Date(reply.created_at), { addSuffix: true }) : 'Just now'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

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
                <Bookmark color='#1E3932' size={24} className={`${saved ? 'fill-[#1E3932]' : ''} transition-transform hover:scale-110`} />
              </button>
            </div>
            
            <p 
              className="font-bold text-sm mb-1 cursor-pointer hover:underline" 
              onClick={handleLikeCountClick}
            >
              {likeCount} likes
            </p>
            <p className="text-xs text-gray-500 uppercase mb-3">
              {post.created_at ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true }) : 'Just now'}
            </p>
            
            {replyTo && (
              <div className="bg-gray-100 p-2 rounded-lg flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">
                  Replying to <span className="font-medium">@{replyTo.username || replyTo.user}</span>
                </span>
                <button onClick={() => setReplyTo(null)}>
                  <X size={16} />
                </button>
              </div>
            )}
            
            <form onSubmit={handleCommentSubmit} className="flex items-center">
              <button type="button" onClick={() => setShowEmojis(!showEmojis)} className="mr-2">
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
            
            {showEmojis && (
              <div className="absolute bottom-16 left-0 bg-white p-2 rounded-lg shadow-lg border flex space-x-2">
                {['😊', '❤️', '👍', '🔥', '😂', '😍', '🙌', '👏'].map(emoji => (
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

      {showLikedUsers && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl border-2 border-[#198754] z-[60]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Liked by</h3>
              <button onClick={() => setShowLikedUsers(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {likedUsers.length > 0 ? (
                likedUsers.map(user => (
                  <div key={user.id} className="flex items-center mb-2">
                    <img 
                      src={`${CLOUDINARY_ENDPOINT}${user.profile_picture}` || '/default-profile.png'} 
                      alt={user.username} 
                      className="w-8 h-8 rounded-full mr-2"
                    />
                    <span 
                      className="font-medium cursor-pointer hover:underline"
                      onClick={() => navigate(`/user/${user.username}`)}
                    >
                      {user.username}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No likes yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 z-50 flex items-center justify-center">
          <div 
            ref={confirmationRef}
            className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl border-2 border-[#198754] z-[60]"
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