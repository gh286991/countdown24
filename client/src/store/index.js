import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import countdownReducer from './countdownSlice';
import receiverReducer from './receiverSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    countdowns: countdownReducer,
    receiver: receiverReducer,
  },
});

export default store;
