import { lazy, Suspense } from "react";

const Loader = lazy(()=> import('../../utils/Loader/Loader'))
const ProfilePage = lazy(()=> import('../../Components/UserProfile/ProfilePage'))

const UserProfile = () => {
    const loggedInUserData = {
      username: "User1",
      profileImage: "/path/to/profile-image.jpg",
      postCount: 1,
      followerCount: 987,
      followingCount: 897,
      bio: "living under the sky",
      website: "https://youtube.user1.com",
      posts: [
        { imageUrl: "/path/to/post1.jpg" }
        // Add more posts as needed
      ]
    };
    
    return (
      <Suspense fallback={<Loader/>}>
        {/* Example of logged-in user profile */}
        <ProfilePage isLoggedInUser={true} userData={loggedInUserData} />
      </Suspense>
    );
  };

export default UserProfile