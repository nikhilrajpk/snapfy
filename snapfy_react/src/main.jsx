import { StrictMode } from 'react'
import { RouterProvider } from 'react-router-dom'
import router from './Routers/router.jsx'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Provider } from 'react-redux'
import { store } from './redux/store.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store} >
      <RouterProvider router={router} />
      <App />
    </Provider>
  </StrictMode>,
)
