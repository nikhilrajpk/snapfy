import React from 'react'
const OtherUserProfile = React.lazy(()=> import('../Features/UserProfile/OtherUsersProfile'))

function ViewOtherUserPage() {
  return (
    <>
        <OtherUserProfile/>
    </>
  )
}

export default ViewOtherUserPage