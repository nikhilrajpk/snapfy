import React from 'react'

const UserProfile = React.lazy(()=> import('../Features/UserProfile/UserProfile'))

function UserProfilePage() {
  return (
    <>
        <UserProfile/>
    </>
  )
}

export default UserProfilePage