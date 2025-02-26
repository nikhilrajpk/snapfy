import React from 'react'
import { createBrowserRouter} from 'react-router-dom'

import ProtectedRoute from '../utils/ProtectedRoute/ProtectedRoute'
const Error404 = React.lazy(()=> import('../ErrorPage/Error404'))
const SignUp = React.lazy(()=> import('../Components/Auth/SignUp'))
const Login = React.lazy(()=> import('../Components/Auth/Login'))
const OTPVerification = React.lazy(()=> import('../Components/Auth/OTPVerification'))
const RouterPage = React.lazy(()=> import('./RouterPage'))
const HomePage = React.lazy(()=> import('../Pages/HomePage'))
const EmailInputComponent = React.lazy(()=> import('../Components/Auth/EmailInputComponent'))
const ResetPassword = React.lazy(()=> import('../Components/Auth/ResetPassword'))

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
                path: '/home',
                element: (
                    <ProtectedRoute authentication={true}>
                        <HomePage/>
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
                path: '*',
                element: (
                    <Error404/>
                )
            },
        ]
    }
])

export default router