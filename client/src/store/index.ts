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

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;

