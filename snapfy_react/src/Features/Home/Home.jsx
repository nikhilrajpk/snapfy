import React from 'react';

const Navbar = React.lazy(()=> import('../../Components/Navbar/Navbar'))
const Stories = React.lazy(()=> import('../../Components/Stories/Stories'))
const Post = React.lazy(()=> import('../../Components/Post/Post'))
const Suggestions = React.lazy(()=> import('../../Components/Suggestions/Suggestions'))
const Logo = React.lazy(()=> import('../../Components/Logo/Logo'))

function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left sidebar - 2 columns */}
          <div className="lg:col-span-2">
            <div className="sticky top-6">
              <Logo />
              <Navbar />
            </div>
          </div>
          
          {/* Main content - 7 columns */}
          <div className="lg:col-span-7 space-y-6">
            <Stories />
            <Post 
              username="user1"
              profileImage="/api/placeholder/48/48"
              image="/api/placeholder/600/400"
              likes={1234}
              description="description......"
              hashtags={["mountain", "empty"]}
              commentCount={111}
            />
            {/* More posts would be mapped here */}
          </div>
          
          {/* Right sidebar - 3 columns */}
          <div className="lg:col-span-3">
            <div className="sticky top-6 space-y-4">
              <h2 className="text-gray-700 font-semibold text-lg mb-3">SUGGESTED FOR YOU</h2>
              <Suggestions />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;



// import { HomeIcon } from 'lucide-react'
// import React from 'react'
// import { useSelector } from 'react-redux'
// import { CLOUDINARY_ENDPOINT } from '../../APIEndPoints'
// import Logout from '../../Components/Auth/Logout'

// function Home() {
//     const {user} = useSelector(state => state.user)
//     const googleImg = String(user?.profile_picture).startsWith('https') ? true : false;
//   return (
//     <div>Home : {user?.username}
//         <HomeIcon color='gray' />
//         <h1>
//             {user?.id}
//         </h1>
//         {
//           googleImg ? (
//             <img src={user?.profile_picture} alt='profile'
//               className='w-24 h-24 rounded-full' loading='lazy' />
//           ) : (
//             <img src={`${CLOUDINARY_ENDPOINT}${user?.profile_picture}`} alt='profile'
//                   className='w-24 h-24 rounded-full' loading='lazy'
//             />
//           )
//         }
//         <Logout/>
//     </div>
//   )
// }

// export default Home