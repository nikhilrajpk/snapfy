import React, { lazy, Suspense, useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../axiosInstance";
import { CLOUDINARY_ENDPOINT } from "../../APIEndPoints";
import { getUser } from "../../API/authAPI";

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
      console.log("Fetching user data for:", username);
      const response = await getUser(username);
      console.log("User data fetched:", response);
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
    console.log("useEffect triggered for username:", username);
    let isMounted = true;
    fetchUserData().then(() => {
      if (!isMounted) {
        console.log("Component unmounted, skipping state update");
      }
    });
    return () => {
      isMounted = false; // Cleanup to prevent state updates on unmount
      console.log("useEffect cleanup for username:", username);
    };
  }, [fetchUserData]);

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
  };

  if (isLoading) {
    return <Loader />;
  }

  console.log("Rendering profileData:", profileData);

  return (
    <Suspense fallback={<Loader />}>
      <ProfilePage isLoggedInUser={false} userData={profileData} />
    </Suspense>
  );
};

export default React.memo(OtherUsersProfile, (prevProps, nextProps) => {
  return prevProps.username === nextProps.username;
});