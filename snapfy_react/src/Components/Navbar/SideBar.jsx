import React from 'react'
import Navbar from './Navbar'
import Logo from '../Logo/Logo'

function SideBar() {
  return (
    <div className="w-56 border-r border-gray-200 hidden lg:block">
        <div className="sticky top-0 p-4 h-screen">
            <div className="mb-3 mt-2 ml-[-6px]">
                <Logo />
            </div>
        <Navbar />
        </div>
    </div>
  )
}

export default SideBar