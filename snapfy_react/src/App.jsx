import React, { Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

const Error404 = React.lazy(()=> import('./ErrorPage/Error404'))
const Loader = React.lazy(()=> import('./utils/Loader/Loader'))
const SignUp = React.lazy(()=> import('./Components/SignUp'))
const Login = React.lazy(()=> import('./Components/Login'))

function App() {

  return (
    <Suspense fallback={<Loader/>}>
      <Router>
        <Routes>
          <Route path='/' element={<Login/>} ></Route>
          <Route path='/register' element={<SignUp/>} />
          <Route path='*' element={<Error404/>} />
        </Routes>
      </Router>
    </Suspense>
  )
}

export default App
