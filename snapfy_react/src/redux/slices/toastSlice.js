import { createSlice } from "@reduxjs/toolkit";

export const initialState = {
    show: false,
    message: null,
    type: null,
    action: null,
}

const toastSlice = createSlice({
    name:'toast',
    initialState,
    reducers : {
        showToast : (state, action)=>{
            state.show = true
            state.message = action.payload.message
            state.type = action.payload.type
            state.action = action.payload.action || null
        },
        hideToast : (state)=>{
            state.show = false
        }
    }
})

export const {showToast, hideToast} = toastSlice.actions
export default toastSlice.reducer