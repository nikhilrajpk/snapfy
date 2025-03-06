import React, { useEffect, useState, Suspense } from 'react';
import { getPosts } from '../../API/postAPI';
import { CLOUDINARY_ENDPOINT } from '../../APIEndPoints';
import Loader from '../../utils/Loader/Loader';

const Navbar = React.lazy(() => import('../../Components/Navbar/Navbar'));
const Stories = React.lazy(() => import('../../Components/Stories/Stories'));
const Post = React.lazy(() => import('../../Components/Post/Post'));
const Suggestions = React.lazy(() => import('../../Components/Suggestions/Suggestions'));
const Logo = React.lazy(() => import('../../Components/Logo/Logo'));

function Home() {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const retrievePosts = async () => {
      try {
        const response = await getPosts();
        console.log('Posts fetched:', response);
        setPosts(response);
      } catch (error) {
        console.log('Error fetching posts on home:', error);
      } finally {
        setIsLoading(false);
      }
    };

    retrievePosts();
  }, []);

  const normalizeUrl = (url) => {
    return url.replace(/^(auto\/upload\/)+/, '');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-2">
            <div className="sticky top-6">
              <Suspense fallback={<Loader />}>
                <Logo />
              </Suspense>
              <Suspense fallback={<Loader />}>
                <Navbar />
              </Suspense>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <Suspense fallback={<Loader />}>
              <Stories />
            </Suspense>
            {isLoading ? (
              <div className="text-center">Loading posts...</div>
            ) : posts.length > 0 ? (
              posts.map((p) => (
                <Suspense key={p?.id} fallback={<Loader />}>
                  <Post
                    id={p?.id}
                    username={p?.user?.username}
                    profileImage={
                      p?.user?.profile_picture
                        ? `${CLOUDINARY_ENDPOINT}${p.user.profile_picture}`
                        : '/default-profile.png'
                    }
                    image={normalizeUrl(p?.file)}
                    likes={1234} // Replace with p?.likes if available
                    caption={p?.caption}
                    hashtags={p?.hashtags.map((tag) => tag.name)}
                    mentions={p?.mentions.map((m) => m.username)}
                    commentCount={111} // Replace with p?.commentCount if available
                  />
                </Suspense>
              ))
            ) : (
              <div className="text-center text-gray-500">No posts available</div>
            )}
          </div>

          <div className="lg:col-span-3">
            <div className="sticky top-6 space-y-4">
              <h2 className="text-gray-700 font-semibold text-lg mb-3">SUGGESTED FOR YOU</h2>
              <Suspense fallback={<Loader />}>
                <Suggestions />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;