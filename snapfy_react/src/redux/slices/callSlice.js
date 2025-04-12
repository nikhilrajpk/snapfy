// slices/callSlice.js
import { createSlice } from '@reduxjs/toolkit';

const callSlice = createSlice({
  name: 'call',
  initialState: {
    callState: null, // 'incoming', 'outgoing', 'active', null
    callId: null,
    caller: null,
    callOfferSdp: null,
    callDuration: 0,
    roomId: null,
  },
  reducers: {
    setCallState(state, action) {
      state.callState = action.payload;
    },
    setCallId(state, action) {
      state.callId = action.payload;
    },
    setCaller(state, action) {
      state.caller = action.payload;
    },
    setCallOfferSdp(state, action) {
      state.callOfferSdp = action.payload;
    },
    setCallDuration(state, action) {
      state.callDuration = action.payload;
    },
    setRoomId(state, action) {
      state.roomId = action.payload;
    },
    resetCall(state) {
      if (state.callState === 'active') return; // Prevent reset during active call
      state.callState = null;
      state.callId = null;
      state.caller = null;
      state.callOfferSdp = null;
      state.callDuration = 0;
      state.roomId = null;
    },
  },
});

export const {
  setCallState,
  setCallId,
  setCaller,
  setCallOfferSdp,
  setCallDuration,
  setRoomId,
  resetCall,
} = callSlice.actions;

// Thunk actions
export const startCall = (callData) => async (dispatch) => {
  dispatch(setCallState('outgoing'));
  dispatch(setCallId(callData.callId));
  dispatch(setCaller(callData.caller));
  dispatch(setRoomId(callData.roomId));
};

export const acceptCall = (callData) => async (dispatch) => {
  dispatch(setCallState('incoming'));
  dispatch(setCallId(callData.callId));
  dispatch(setCaller(callData.caller));
  dispatch(setCallOfferSdp(callData.sdp));
  dispatch(setRoomId(callData.roomId));
};

export const endCall = (callData) => async (dispatch) => {
  dispatch(setCallState(null));
  dispatch(setCallDuration(0)); // Reset duration here
  // Keep callId and roomId for history update, reset later if needed
};

export default callSlice.reducer;