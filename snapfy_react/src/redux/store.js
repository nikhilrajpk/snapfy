import {configureStore} from '@reduxjs/toolkit'
import userReducer from  './slices/userSlice'
import toastReducer from './slices/toastSlice'

export const store = configureStore({
  reducer: {
    user: userReducer,
    toast: toastReducer,
  },
});