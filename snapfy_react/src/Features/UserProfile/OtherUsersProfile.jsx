import React, { lazy, Suspense, useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../axiosInstance";
import { CLOUDINARY_ENDPOINT } from "../../APIEndPoints";
import { getUser } from "../../API/authAPI";
import { store } from "../../redux/store";
import { setUser } from "../../redux/slices/userSlice";

const Loader = lazy(() => import('../../utils/Loader/Loader'));
const ProfilePage = lazy(() => import('../../Components/UserProfile/ProfilePage'));

const OtherUsersProfile = () => {
  const [userData, setUserData] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { username } = useParams();
  const navigate = useNavigate();

  const fetchProfilePicture = useCallback(async (profilePicture) => {
    if (!profilePicture) {
      setPreviewImage('/default-profile.png');
      return;
    }
    try {
      const imageUrl = profilePicture.startsWith('http')
        ? profilePicture
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
      console.log("Fetching user data for:", username);
      const response = await getUser(username);
      if (!response || typeof response !== 'object') {
        throw new Error("Invalid user data response");
      }
      setUserData(response);
      await fetchProfilePicture(response.profile_picture);
    } catch (error) {
      console.error("Error retrieving user data:", error.response?.data || error.message || error);
      navigate('/home', { replace: true });
    } finally {
      setIsLoading(false);
    }
  }, [username, fetchProfilePicture, navigate]);

  useEffect(() => {
    let isMounted = true;
    fetchUserData().then(() => {
      if (!isMounted) console.log("Component unmounted, skipping state update");
    });
    return () => {
      isMounted = false;
    };
  }, [fetchUserData]);

  const handleUserUpdate = async (updatedUser) => {
    setUserData(updatedUser);
    // After update (e.g., block), refresh logged-in user’s state
    const { user } = store.getState().user; // Access Redux store directly for simplicity
    const updatedLoggedInUser = await getUser(user.username);
    store.dispatch(setUser(updatedLoggedInUser));
  };

  const profileData = userData ? {
    id: userData.id,
    username: userData.username || '',
    profileImage: previewImage || '/default-profile.png',
    postCount: userData.posts?.length || 0,
    follower_count: userData.follower_count || 0,
    following_count: userData.following_count || 0,
    first_name: userData.first_name || '',
    last_name: userData.last_name || '',
    bio: userData.bio || '',
    posts: userData.posts || [],
    followers: userData.followers || [],
    following: userData.following || [],
    blocked_users: userData.blocked_users || [],
  } : {
    id: '',
    username,
    profileImage: '/default-profile.png',
    postCount: 0,
    follower_count: 0,
    following_count: 0,
    first_name: '',
    last_name: '',
    bio: '',
    posts: [],
    followers: [],
    following: [],
    blocked_users: [],
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <Suspense fallback={<Loader />}>
      <ProfilePage 
        isLoggedInUser={false} 
        userData={profileData} 
        onUserUpdate={handleUserUpdate}
      />
    </Suspense>
  );
};

export default React.memo(OtherUsersProfile, (prevProps, nextProps) => {
  return prevProps.username === nextProps.username;
});