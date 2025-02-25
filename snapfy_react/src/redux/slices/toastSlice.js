import { createSlice } from "@reduxjs/toolkit";

export const initialState = {
    show: false,
    message: null,
    type: null
}

const toastSlice = createSlice({
    name:'toast',
    initialState,
    reducers : {
        showToast : (state, action)=>{
            state.show = true
            state.message = action.payload.message
            state.type = action.payload.type
        },
        hideToast : (state)=>{
            state.show = false
        }
    }
})

export const {showToast, hideToast} = toastSlice.actions
export default toastSlice.reducer