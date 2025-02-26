import { HomeIcon } from 'lucide-react'
import React from 'react'
import { useSelector } from 'react-redux'
import { CLOUDINARY_ENDPOINT } from '../../APIEndPoints'
import Logout from '../../Components/Auth/Logout'

function Home() {
    const {user} = useSelector(state => state.user)
    const googleImg = String(user?.profile_picture).startsWith('https') ? true : false;
  return (
    <div>Home : {user?.username}
        <HomeIcon color='gray' />
        <h1>
            {user?.id}
        </h1>
        {
          googleImg ? (
            <img src={user?.profile_picture} alt='profile'
              className='w-24 h-24 rounded-full' loading='lazy' />
          ) : (
            <img src={`${CLOUDINARY_ENDPOINT}${user?.profile_picture}`} alt='profile'
                  className='w-24 h-24 rounded-full' loading='lazy'
            />
          )
        }
        <Logout/>
    </div>
  )
}

export default Home