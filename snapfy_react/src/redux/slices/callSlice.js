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
    callType: null, // 'audio' or 'video'
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
    setCallType(state, action) {
      if (action.payload === 'video' || action.payload === 'audio') {
        state.callType = action.payload;
      }
    },
    resetCall(state) {
      if (state.callState === 'active') return; // Prevent reset during active call
      state.callState = null;
      state.callId = null;
      state.caller = null;
      state.callOfferSdp = null;
      state.callDuration = 0;
      state.roomId = null;
      state.callType = null;
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
  setCallType,
  resetCall,
} = callSlice.actions;

// Thunk actions
export const startCall = ({ callId, roomId, caller, sdp, callType }) => async (dispatch) => {
  dispatch(setCallState('outgoing'));
  dispatch(setCallId(callId));
  dispatch(setCaller(caller));
  dispatch(setRoomId(roomId));
  dispatch(setCallOfferSdp(sdp));
  dispatch(setCallType(callType)); 
};

export const acceptCall = ({ callId, caller, sdp, roomId, callType }) => async (dispatch) => {
  dispatch(setCallState('incoming'));
  dispatch(setCallId(callId));
  dispatch(setCaller(caller));
  dispatch(setCallOfferSdp(sdp));
  dispatch(setRoomId(roomId));
  dispatch(setCallType(callType || 'audio'));
};

export const endCall = ({ status, duration }) => async (dispatch) => {
  dispatch(setCallState(null));
  dispatch(setCallDuration(0)); // Reset duration
  dispatch(setCallType(null)); // Reset call type
};

export default callSlice.reducer;