import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

function ProtectedRoute({children, authentication=true}) {
    const navigate = useNavigate()
    const {user, isAuthenticated} = useSelector((state)=> state.user)

    useEffect(()=> {
        if(authentication && !isAuthenticated){
            navigate('/')
        }else if(!authentication && isAuthenticated){
            if (user?.is_staff){
                navigate('/admin-dashboard')
            }else{
                navigate('/home')
            }
        }
    }, [isAuthenticated, authentication, navigate, user])

    return children
}

export default ProtectedRoute