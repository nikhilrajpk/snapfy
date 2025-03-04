import React from 'react'
import { createBrowserRouter} from 'react-router-dom'

import ProtectedRoute from '../utils/ProtectedRoute/ProtectedRoute'
const Error404 = React.lazy(()=> import('../ErrorPage/Error404'))
const SignUp = React.lazy(()=> import('../Components/Auth/SignUp'))
const Login = React.lazy(()=> import('../Components/Auth/Login'))
const OTPVerification = React.lazy(()=> import('../Components/Auth/OTPVerification'))
const RouterPage = React.lazy(()=> import('./RouterPage'))
const EmailInputComponent = React.lazy(()=> import('../Components/Auth/EmailInputComponent'))
const ResetPassword = React.lazy(()=> import('../Components/Auth/ResetPassword'))
const HomePage = React.lazy(()=> import('../Pages/HomePage'))
const UserProfile = React.lazy(()=> import('../Pages/UserProfilePage'))
const OtherUsersProfile = React.lazy(()=> import('../Pages/ViewOtherUserPage'))
const EditUserProfile = React.lazy(()=> import('../Components/UserProfile/EditProfile'))

const CreateContentPage = React.lazy(()=> import('../Pages/CreateContentPage'))
const EditContentPage = React.lazy(()=> import('../Pages/EditContentPage'))

const router = createBrowserRouter([
    {
        path:'/',
        element: <RouterPage/>,
        children : [
            {
                path: '/',
                element: (
                    <ProtectedRoute authentication={false}>
                        <Login/>
                    </ProtectedRoute>
                )
            },
            {
                path: '/register',
                element: (
                    <ProtectedRoute authentication={false}>
                        <SignUp/>
                    </ProtectedRoute>
                )
            },
            {
                path: '/verify-otp',
                element: (
                    <ProtectedRoute authentication={false}>
                        <OTPVerification/>
                    </ProtectedRoute>
                )
            },
            {
                path: '/enter-email',
                element: (
                    <ProtectedRoute authentication={false}>
                        <EmailInputComponent/>
                    </ProtectedRoute>
                )
            },
            {
                path: '/reset-password',
                element: (
                    <ProtectedRoute authentication={false}>
                        <ResetPassword/>
                    </ProtectedRoute>
                )
            },
            
            {
                path: '/home',
                element: (
                    <ProtectedRoute authentication={true}>
                        <HomePage/>
                    </ProtectedRoute>
                )
            },
            {
                path: '/:username',
                element: (
                    <ProtectedRoute authentication={true}>
                        <UserProfile/>
                    </ProtectedRoute>
                )
            },
            {
                path: '/user/:username',
                element: (
                    <ProtectedRoute authentication={true}>
                        <OtherUsersProfile/>
                    </ProtectedRoute>
                )
            },
            {
                path: '/:username/profile/update',
                element: (
                    <ProtectedRoute authentication={true}>
                        <EditUserProfile/>
                    </ProtectedRoute>
                )
            },
            {
                path: '/create-post',
                element: (
                    <ProtectedRoute authentication={true}>
                        <CreateContentPage/>
                    </ProtectedRoute>
                )
            },
            {
                path: '/edit-post/:postId',
                element: (
                    <ProtectedRoute authentication={true}>
                        <EditContentPage/>
                    </ProtectedRoute>
                )
            },

            {
                path: '*',
                element: (
                    <Error404/>
                )
            },
        ]
    }
])

export default router