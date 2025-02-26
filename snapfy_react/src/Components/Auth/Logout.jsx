import { LogOut } from 'lucide-react'
import { logout } from '../../redux/slices/userSlice'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import { showToast } from '../../redux/slices/toastSlice'

function Logout() {
    const dispatch = useDispatch()
    const navigate = useNavigate()


    const onclick = ()=>{
        dispatch(logout())

        // dispatching toast action
        dispatch(showToast({message: "Logged out.", type:"success"}))

        // navigating to login page
        navigate('/')
    }
  return (
    <>
        <button onClick={onclick} 
        className='rounded-md w-fit h-8 text-white bg-gray-600 flex cursor-pointer'
        >Logout{<LogOut color='white'/>}</button>
    </>
  )
}

export default Logout