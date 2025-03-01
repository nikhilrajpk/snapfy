import React, {Suspense} from 'react'

const Loader = React.lazy(()=> import('../utils/Loader/Loader'))
const CreateContent = React.lazy(()=> import('../Features/CreateContent/CreateContent'))

function CreateContentPage() {
  return (
    <Suspense fallback={<Loader/>}>
        <CreateContent/>
    </Suspense>
  )
}

export default CreateContentPage