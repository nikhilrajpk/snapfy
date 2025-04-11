import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  callState: null, // null, 'incoming', 'outgoing', 'active', 'ended'
  callId: null,
  caller: null,
  callOfferSdp: null,
  callDuration: 0,
  callStartTime: null,
  roomId: null,
};

const callSlice = createSlice({
  name: 'call',
  initialState,
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
    setCallStartTime(state, action) {
      state.callStartTime = action.payload;
    },
    setRoomId(state, action) {
      state.roomId = action.payload;
    },
    startCall(state, action) {
      const { callId, roomId, caller } = action.payload;
      state.callState = 'outgoing';
      state.callId = callId;
      state.caller = caller;
      state.roomId = roomId;
      state.callDuration = 0;
      state.callStartTime = null;
      state.callOfferSdp = null;
    },
    acceptCall(state, action) {
      const { callId, caller, sdp, roomId } = action.payload;
      state.callState = 'active';
      state.callId = callId;
      state.caller = caller;
      state.callOfferSdp = sdp;
      state.roomId = roomId;
      state.callStartTime = new Date();
      state.callDuration = 0;
    },
    endCall(state, action) {
      const { status, duration } = action.payload;
      state.callState = 'ended';
      state.callDuration = duration || state.callDuration;
      // Reset other fields after a delay or immediately based on your needs
    },
    resetCall(state) {
      return initialState; // Reset to initial state
    },
  },
});

export const {
  setCallState,
  setCallId,
  setCaller,
  setCallOfferSdp,
  setCallDuration,
  setCallStartTime,
  setRoomId,
  startCall,
  acceptCall,
  endCall,
  resetCall,
} = callSlice.actions;

export default callSlice.reducer;