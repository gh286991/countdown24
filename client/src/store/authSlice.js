import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../api/client';

const TOKEN_KEY = 'countdown24::token';

const getToken = () => window.localStorage.getItem(TOKEN_KEY);

export const registerAccount = createAsyncThunk(
  'auth/register',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/register', payload);
      return data;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || '無法建立帳戶');
    }
  },
);

export const loginAccount = createAsyncThunk(
  'auth/login',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/login', payload);
      return data;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || '登入失敗');
    }
  },
);

export const bootstrapSession = createAsyncThunk(
  'auth/bootstrap',
  async (_, { rejectWithValue }) => {
    const token = getToken();
    if (!token) {
      return { user: null };
    }

    try {
      const { data } = await api.get('/me');
      return data;
    } catch (error) {
      if (error?.response?.status === 401) {
        window.localStorage.removeItem(TOKEN_KEY);
        return { user: null };
      }
      return rejectWithValue(error?.response?.data?.message || '無法取得使用者資料');
    }
  },
);

const initialState = {
  token: getToken(),
  user: null,
  overview: null,
  status: 'idle',
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.overview = null;
      window.localStorage.removeItem(TOKEN_KEY);
    },
    setUserOverview(state, action) {
      state.overview = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerAccount.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(registerAccount.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.error = null;
        state.user = action.payload.user;
        state.token = action.payload.token;
        window.localStorage.setItem(TOKEN_KEY, action.payload.token);
      })
      .addCase(registerAccount.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || '註冊失敗';
      })
      .addCase(loginAccount.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginAccount.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.token = action.payload.token;
        window.localStorage.setItem(TOKEN_KEY, action.payload.token);
      })
      .addCase(loginAccount.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || '登入失敗';
      })
      .addCase(bootstrapSession.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(bootstrapSession.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (action.payload?.user) {
          state.user = action.payload.user;
          state.overview = action.payload;
        } else {
          state.user = null;
          state.overview = null;
          state.token = null;
          window.localStorage.removeItem(TOKEN_KEY);
        }
      })
      .addCase(bootstrapSession.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || '初始化失敗';
      });
  },
});

export const { logout, setUserOverview } = authSlice.actions;
export default authSlice.reducer;
