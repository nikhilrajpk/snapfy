import { lazy, Suspense } from "react";

const Loader = lazy(()=> import('../../utils/Loader/Loader'))
const ProfilePage = lazy(()=> import('../../Components/UserProfile/ProfilePage'))

const OtherUsersProfile = () => {
    
    
    const otherUserData = {
      username: "User2",
      profileImage: "/path/to/other-profile.jpg",
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
        {/* Example of other user profile */}
        <ProfilePage isLoggedInUser={false} userData={otherUserData} />
      </Suspense>
    );
  };

export default OtherUsersProfile