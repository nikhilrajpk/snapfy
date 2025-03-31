import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';
import toastReducer from './slices/toastSlice';

// Load state from localStorage
const loadState = () => {
  try {
    const serializedState = localStorage.getItem('reduxState');
    if (!serializedState) return undefined;

    const parsedState = JSON.parse(serializedState);
    return {
      user: {
        user: parsedState.user || null,
        isAuthenticated: parsedState.isAuthenticated || false,
      },
      toast: undefined, // Don’t persist toast state
    };
  } catch (err) {
    console.error('Could not load state', err);
    return undefined;
  }
};

// Save state to localStorage
const saveState = (state) => {
  try {
    const stateToPersist = {
      user: state.user.user,
      isAuthenticated: state.user.isAuthenticated,
    };
    const serializedState = JSON.stringify(stateToPersist);
    localStorage.setItem('reduxState', serializedState);
  } catch (err) {
    console.error('Could not save state', err);
  }
};

// Store
export const store = configureStore({
  reducer: {
    user: userReducer,
    toast: toastReducer,
  },
  preloadedState: loadState(),
});

// Save Redux state on changes
store.subscribe(() => saveState(store.getState()));