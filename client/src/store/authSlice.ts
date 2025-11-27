import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import api from '../api/client';

const TOKEN_KEY = 'countdown24::token';

const getToken = (): string | null => window.localStorage.getItem(TOKEN_KEY);

interface User {
  id: string;
  name: string;
  email: string;
  role: 'creator' | 'receiver';
  avatar?: string;
  bio?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  overview: any | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role?: 'creator' | 'receiver';
}

interface LoginPayload {
  email: string;
  password: string;
}

interface GoogleLoginPayload {
  credential: string;
  role?: 'creator' | 'receiver';
}

export const registerAccount = createAsyncThunk(
  'auth/register',
  async (payload: RegisterPayload, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/register', payload);
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || '無法建立帳戶');
    }
  },
);

export const loginAccount = createAsyncThunk(
  'auth/login',
  async (payload: LoginPayload, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/login', payload);
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || '登入失敗');
    }
  },
);

export const googleLogin = createAsyncThunk(
  'auth/googleLogin',
  async (payload: GoogleLoginPayload, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/google', payload);
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || 'Google 登入失敗');
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
      const { data } = await api.get('/auth/me');
      return data;
    } catch (error: any) {
      if (error?.response?.status === 401) {
        window.localStorage.removeItem(TOKEN_KEY);
        return { user: null };
      }
      return rejectWithValue(error?.response?.data?.message || '無法取得使用者資料');
    }
  },
);

export const upgradeToCreator = createAsyncThunk(
  'auth/upgradeToCreator',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/upgrade-to-creator');
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || '升級失敗');
    }
  },
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profile: { name: string; avatar?: string; bio?: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.put('/auth/profile', profile);
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || '更新失敗');
    }
  },
);

const initialState: AuthState = {
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
    setUserOverview(state, action: PayloadAction<any>) {
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
        state.error = (action.payload as string) || '註冊失敗';
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
        state.error = (action.payload as string) || '登入失敗';
      })
      .addCase(googleLogin.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(googleLogin.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.token = action.payload.token;
        window.localStorage.setItem(TOKEN_KEY, action.payload.token);
      })
      .addCase(googleLogin.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) || 'Google 登入失敗';
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
        state.error = (action.payload as string) || '初始化失敗';
      })
      .addCase(upgradeToCreator.fulfilled, (state, action) => {
        if (action.payload?.user) {
          state.user = action.payload.user;
        }
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        if (action.payload?.user) {
          state.user = action.payload.user;
        }
      });
  },
});

export const { logout, setUserOverview } = authSlice.actions;
export default authSlice.reducer;
