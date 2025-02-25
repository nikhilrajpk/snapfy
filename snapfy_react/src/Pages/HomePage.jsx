import React, {Suspense} from 'react'

const Home = React.lazy(()=> import('../Features/Home/Home'))
const Loader = React.lazy(()=> import('../utils/Loader/Loader'))

function HomePage() {
  return (
    <Suspense fallback={<Loader/>}>
        <Home/>
    </Suspense>
  )
}

export default HomePage