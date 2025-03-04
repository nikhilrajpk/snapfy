import React from 'react'
import { useSelector } from 'react-redux'
import Toast from './utils/Toast/Toast'


function App() {
  const {show, message, type} = useSelector(state => state.toast)

  return (
    <>
      {show && <Toast message={message} type={type} /> }
    </>
  )
}

export default App
