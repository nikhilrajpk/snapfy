import React from 'react'
import { createBrowserRouter} from 'react-router-dom'

import ProtectedRoute from '../utils/ProtectedRoute/ProtectedRoute'
import {AdminProtectedRoute} from '../utils/ProtectedRoute/AdminProtectRoute'

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

const SearchBarPage = React.lazy(()=> import('../Pages/SearchBarPage'))
const ExplorePage = React.lazy(()=> import('../Pages/ExplorePage'))
const Shorts = React.lazy(()=> import('../Features/Shorts/Shorts'))
const Message = React.lazy(()=> import('../Features/Messages/Message'))
const Notification = React.lazy(()=> import('../Features/Notification/Notification'))
const LiveStreamPage = React.lazy(()=> import('../Components/Stories/LiveStreamPage'))

const AdminLayout = React.lazy(() => import('../Components/Admin/AdminLayout'));
const Dashboard = React.lazy(() => import('../Components/Admin/Dashboard'));
const Reports = React.lazy(()=> import('../Components/Admin/Reports'))
const Users = React.lazy(()=> import('../Components/Admin/Users'))
const BlockedUsers = React.lazy(()=> import('../Components/Admin/BlockedUsers'))
const TrendingSongs = React.lazy(()=> import('../Components/Admin/TrendingSongs'))
const Analytics = React.lazy(()=> import('../Components/Admin/Analytics'))
const ExportReports = React.lazy(()=> import('../Components/Admin/ExportReports'))


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
                path: '/search',
                element: (
                    <ProtectedRoute authentication={true}>
                        <SearchBarPage/>
                    </ProtectedRoute>
                )
            },
            {
                path: '/explore',
                element: (
                    <ProtectedRoute authentication={true}>
                        <ExplorePage/>
                    </ProtectedRoute>
                )
            },
            {
                path: '/shorts',
                element: (
                    <ProtectedRoute authentication={true}>
                        <Shorts/>
                    </ProtectedRoute>
                )
            },
            {
                path: '/messages',
                element: (
                    <ProtectedRoute authentication={true}>
                        <Message/>
                    </ProtectedRoute>
                )
            },
            {
                path: '/messages/:conversationId',
                element: (
                    <ProtectedRoute authentication={true}>
                        <Message/>
                    </ProtectedRoute>
                )
            },
            {
                path: '/messages/new/:username',
                element: (
                    <ProtectedRoute authentication={true}>
                        <Message/>
                    </ProtectedRoute>
                )
            },
            {
                path: '/notifications',
                element: (
                    <ProtectedRoute authentication={true}>
                        <Notification/>
                    </ProtectedRoute>
                )
            },
            {
                path: "/live/:liveId",
                element: (
                    <ProtectedRoute authentication={true}>
                        <LiveStreamPage/>
                    </ProtectedRoute>
                )
            },

            {
                path: '/admin',
                element: (
                  <AdminProtectedRoute>
                    <AdminLayout />
                  </AdminProtectedRoute>
                ),
                children: [
                  {
                    index: true,
                    element: <Dashboard />,
                  },
                  {
                    path: 'users',
                    element: <Users />,
                  },
                  {
                    path: 'blocked-users',
                    element: <BlockedUsers />,
                  },
                  {
                    path: 'reports',
                    element: <Reports />,
                  },
                  {
                    path: 'trending',
                    element: <TrendingSongs />,
                  },
                  {
                    path: 'analytics',
                    element: <Analytics />,
                  },
                  {
                    path: 'export',
                    element: <ExportReports />,
                  },
                //   {
                //     path: 'notifications',
                //     element: <AdminNotifications />,
                //   },
                ],
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