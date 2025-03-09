import { createSlice } from "@reduxjs/toolkit";

export const initialState = {
    user : null,
    token : null,
    refreshToken : null,
    isAuthenticated : false
}


const userSlice = createSlice({
    name : 'user',
    initialState,
    reducers : {
        login : (state, action) => {
            state.user = action.payload.user
            state.token = action.payload.token
            state.isAuthenticated = true
            state.refreshToken = action.payload.refreshToken || state.refreshToken;
        },
        logout : (state) => {
            state.user = null
            state.token = null
            state.isAuthenticated = false
            state.refreshToken = null
        },
        setUser: (state, action) => {
            state.user = action.payload; // Update the logged-in user’s data
        }
    }
})


export const {login, logout, setUser} = userSlice.actions
export default userSlice.reducer