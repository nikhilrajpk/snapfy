import React, { Suspense } from 'react'
import { Outlet } from 'react-router-dom'

const Loader = React.lazy(()=> import('../utils/Loader/Loader'))


function RouterPage() {
  return (
    <Suspense fallback={<Loader/>}>
        <Outlet/>
    </Suspense>
  )
}

export default RouterPage