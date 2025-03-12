import React, { lazy, Suspense, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../axiosInstance";
import { CLOUDINARY_ENDPOINT } from "../../APIEndPoints";
import { getUser } from "../../API/authAPI";
import { useSelector } from "react-redux";

const Loader = lazy(() => import('../../utils/Loader/Loader'));
const ProfilePage = lazy(() => import('../../Components/UserProfile/ProfilePage'));

const UserProfile = () => {
  const [userData, setUserData] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useSelector(state => state.user);
  const navigate = useNavigate();

  const username = user.username;

  const fetchProfilePicture = useCallback(async (profilePicture) => {
    if (!profilePicture) {
      console.log("No profile picture provided, using default");
      setPreviewImage('/default-profile.png');
      return;
    }
    try {
      console.log("Fetching profile picture for:", profilePicture);
      const imageUrl = profilePicture.startsWith('http')
        ? URL.createObjectURL((await axiosInstance.get('profile/picture/', { responseType: 'blob' })).data)
        : `${CLOUDINARY_ENDPOINT}${profilePicture}`;
      setPreviewImage(imageUrl);
    } catch (error) {
      console.error("Error fetching profile picture:", error);
      setPreviewImage('/default-profile.png');
    }
  }, []);

  const fetchUserData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getUser(username);
      if (!response || typeof response !== 'object') {
        throw new Error("Invalid user data response");
      }
      const sortedPosts = (response.posts || []).sort((a, b) => b.id - a.id);
      setUserData({ ...response, posts: sortedPosts });
      await fetchProfilePicture(response.profile_picture);
    } catch (error) {
      console.error("Error retrieving user data:", error.response?.data || error.message || error);
      navigate('/home', { replace: true });
    } finally {
      setIsLoading(false);
    }
  }, [username, fetchProfilePicture, navigate]);

  const refetchUserData = useCallback(() => {
    fetchUserData();
  }, [fetchUserData]);

  useEffect(() => {
    let isMounted = true;
    fetchUserData().then(() => {
      if (!isMounted) {
        console.log("Component unmounted, skipping state update");
      }
    });
    return () => {
      isMounted = false;
    };
  }, [fetchUserData, username]);

  const profileData = userData ? {
    username: userData.username || '',
    profileImage: previewImage || '/default-profile.png',
    postCount: userData.posts?.length || 0,
    followerCount: userData.followers?.length || 0,
    followingCount: userData.following?.length || 0,
    first_name: userData.first_name || '',
    last_name: userData.last_name || '',
    bio: userData.bio || '',
    posts: userData.posts || [],
    saved_posts: userData.saved_posts || [],
    archived_posts: userData.archived_posts || [],
    followers: userData.followers || [],
    following: userData.following || [],
    blocked_users: userData.blocked_users || [],
  } : {
    username,
    profileImage: '/default-profile.png',
    postCount: 0,
    followerCount: 0,
    followingCount: 0,
    first_name: '',
    last_name: '',
    bio: '',
    posts: [],
    saved_posts: [],
    archived_posts: [], 
    followers: [],
    following: [],
    blocked_users: [],
  };

  console.log('UserProfile profileData:', profileData); // Log profileData

  if (isLoading) {
    return <Loader />;
  }

  return (
    <Suspense fallback={<Loader />}>
      <ProfilePage
        isLoggedInUser={true}
        userData={profileData}
        onPostDeleted={refetchUserData}
        onSaveChange={refetchUserData}
      />
    </Suspense>
  );
};

export default React.memo(UserProfile, (prevProps, nextProps) => {
  return prevProps.username === nextProps.username;
});