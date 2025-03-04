// import React, { lazy, Suspense, useEffect, useState, useCallback } from "react";
// import { useSelector, useDispatch } from "react-redux";
// import axiosInstance from "../../axiosInstance";
// import { CLOUDINARY_ENDPOINT } from "../../APIEndPoints";
// import { showToast } from "../../redux/slices/toastSlice";

// const Loader = lazy(() => import('../../utils/Loader/Loader'));
// const ProfilePage = lazy(() => import('../../Components/UserProfile/ProfilePage'));

// const UserProfile = () => {
//   const [previewImage, setPreviewImage] = useState(null);
//   const { user } = useSelector(state => state.user);
//   const dispatch = useDispatch()

//   const fetchProfilePicture = useCallback(async () => {
//     if (!user || !user.profile_picture) return;
//     try {
//       let imageUrl;
//       if (user.profile_picture.startsWith('http')) {
//         const response = await axiosInstance.get('profile/picture/', {
//           responseType: 'blob',
//         });
//         imageUrl = URL.createObjectURL(response.data);
//       } else {
//         imageUrl = `${CLOUDINARY_ENDPOINT}${user.profile_picture}`;
//       }
//       setPreviewImage(imageUrl);
//     } catch (error) {
//       console.error("Error fetching profile picture:", error);
//       dispatch(showToast({message:"Error fetching profile picture", type:"error"}))
//       setPreviewImage(null); 
//     }
//   }, [user, dispatch]);

//   useEffect(() => {
//     fetchProfilePicture();
//   }, [fetchProfilePicture]);

//   const loggedInUserData = {
//     username: user?.username || '',
//     profileImage: previewImage || "/path/to/post1.jpg",
//     postCount: user?.posts?.length || 0,
//     followerCount: user?.followers?.length || 0,
//     followingCount: user?.following?.length || 0,
//     first_name: user?.first_name,
//     last_name: user?.last_name,
//     bio: user?.bio || '',
//     posts: user?.posts || [{ imageUrl: "/path/to/post1.jpg" }],
//   };

//   return (
//     <Suspense fallback={<Loader />}>
//       <ProfilePage isLoggedInUser={true} userData={loggedInUserData} />
//     </Suspense>
//   );
// };

// export default React.memo(UserProfile);


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
  const {user} = useSelector(state=> state.user)
  const navigate = useNavigate();

  const username = user.username
  
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
      // console.log("Fetching user data for:", username);
      const response = await getUser(username);
      // console.log("User data fetched:", response);
      if (!response || typeof response !== 'object') {
        throw new Error("Invalid user data response");
      }
      setUserData(response);
      await fetchProfilePicture(response.profile_picture);
    } catch (error) {
      // console.error("Error retrieving user data:", error.response?.data || error.message || error);
      navigate('/home', { replace: true });
    } finally {
      setIsLoading(false);
    }
  }, [username, fetchProfilePicture, navigate]);

  useEffect(() => {
    // console.log("useEffect triggered for username:", username);
    let isMounted = true;
    fetchUserData().then(() => {
      if (!isMounted) {
        console.log("Component unmounted, skipping state update");
      }
    });
    return () => {
      isMounted = false; // Cleanup to prevent state updates on unmount
      // console.log("useEffect cleanup for username:", username);
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

  return (
    <Suspense fallback={<Loader />}>
      <ProfilePage isLoggedInUser={true} userData={profileData} />
    </Suspense>
  );
};

export default React.memo(UserProfile, (prevProps, nextProps) => {
  return prevProps.username === nextProps.username;
});