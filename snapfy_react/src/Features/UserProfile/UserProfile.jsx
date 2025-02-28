import React, { lazy, Suspense, useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import axiosInstance from "../../axiosInstance";
import { CLOUDINARY_ENDPOINT } from "../../APIEndPoints";

const Loader = lazy(() => import('../../utils/Loader/Loader'));
const ProfilePage = lazy(() => import('../../Components/UserProfile/ProfilePage'));

const UserProfile = () => {
  const [previewImage, setPreviewImage] = useState(null);
  const { user } = useSelector(state => state.user);

  const fetchProfilePicture = useCallback(async () => {
    if (!user || !user.profile_picture) return;
    try {
      let imageUrl;
      if (user.profile_picture.startsWith('http')) {
        const response = await axiosInstance.get('profile/picture/', {
          responseType: 'blob',
        });
        imageUrl = URL.createObjectURL(response.data);
      } else {
        imageUrl = `${CLOUDINARY_ENDPOINT}${user.profile_picture}`;
      }
      setPreviewImage(imageUrl);
    } catch (error) {
      console.error("Error fetching profile picture:", error);
      setPreviewImage(null); // Fallback to null or a default image
    }
  }, [user]);

  useEffect(() => {
    fetchProfilePicture();
  }, [fetchProfilePicture]);

  const loggedInUserData = {
    username: user?.username || '',
    profileImage: previewImage || "https://via.placeholder.com/150", // Default image
    postCount: user?.posts?.length || 0,
    followerCount: user?.followers?.length || 0,
    followingCount: user?.following?.length || 0,
    first_name: user?.first_name,
    last_name: user?.last_name,
    bio: user?.bio || '',
    posts: user?.posts || [{ imageUrl: "/path/to/post1.jpg" }],
  };

  return (
    <Suspense fallback={<Loader />}>
      <ProfilePage isLoggedInUser={true} userData={loggedInUserData} />
    </Suspense>
  );
};

export default React.memo(UserProfile);