import React, { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { NotificationProvider } from '../Features/Notification/NotificationContext'

const Loader = React.lazy(()=> import('../utils/Loader/Loader'))


function RouterPage() {
  return (
    <Suspense fallback={<Loader/>}>
      <NotificationProvider>
        <Outlet/>
      </NotificationProvider>
    </Suspense>
  )
}

export default RouterPage