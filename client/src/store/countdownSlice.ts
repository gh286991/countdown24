import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import api from '../api/client';

interface Countdown {
  id: string;
  title: string;
  type: 'story' | 'qr';
  description?: string;
  coverImage?: string;
  theme?: {
    primary: string;
    secondary: string;
  };
  startDate?: string;
  endDate?: string;
  totalDays?: number;
  availableDay?: number;
  dayCards?: any[];
  [key: string]: any;
}

interface CountdownState {
  items: Countdown[];
  selected: Countdown | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  detailStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  detailError: string | null;
  assignments: any[];
  receivers: any[];
  receiversStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
}

export const fetchCreatorCountdowns = createAsyncThunk(
  'countdowns/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/countdowns');
      return data.items || [];
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || '無法取得倒數資訊');
    }
  },
);

export const fetchCountdownDetail = createAsyncThunk(
  'countdowns/fetchDetail',
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/countdowns/${id}`);
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || '找不到倒數內容');
    }
  },
);

export const createCountdown = createAsyncThunk(
  'countdowns/create',
  async (payload: any, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/countdowns', payload);
      return data.countdown;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || '建立倒數失敗');
    }
  },
);

export const updateCountdown = createAsyncThunk(
  'countdowns/update',
  async ({ id, data: updates }: { id: string; data: any }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/countdowns/${id}`, updates);
      return data.countdown;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || '更新倒數失敗');
    }
  },
);

export const assignReceivers = createAsyncThunk(
  'countdowns/assign',
  async ({ id, receiverIds = [], receiverEmails = [] }: { id: string; receiverIds?: string[]; receiverEmails?: string[] }, { rejectWithValue }) => {
    const payload: any = {};
    if (receiverIds.length) payload.receiverIds = receiverIds;
    if (receiverEmails.length) payload.receiverEmails = receiverEmails;
    try {
      const { data } = await api.post(`/countdowns/${id}/assign`, payload);
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || '指派接收者失敗');
    }
  },
);

export const fetchReceivers = createAsyncThunk(
  'countdowns/fetchReceivers',
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/countdowns/${id}/receivers`);
      return data.receivers || [];
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || '無法取得接收者列表');
    }
  },
);

export const removeReceiver = createAsyncThunk(
  'countdowns/removeReceiver',
  async ({ id, receiverId }: { id: string; receiverId: string }, { rejectWithValue }) => {
    try {
      await api.delete(`/countdowns/${id}/receivers/${receiverId}`);
      return { receiverId };
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || '刪除接收者失敗');
    }
  },
);

export const deleteCountdown = createAsyncThunk(
  'countdowns/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await api.delete(`/countdowns/${id}`);
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || '刪除倒數失敗');
    }
  },
);

export const createInvitation = createAsyncThunk(
  'countdowns/createInvitation',
  async (countdownId: string, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/countdowns/${countdownId}/invite`);
      return data.invitation;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || '生成邀請連結失敗');
    }
  },
);

export const checkInvitation = createAsyncThunk(
  'countdowns/checkInvitation',
  async (token: string, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/countdowns/invite/check/${token}`);
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || '檢查邀請失敗');
    }
  },
);

export const acceptInvitation = createAsyncThunk(
  'countdowns/acceptInvitation',
  async (token: string, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/countdowns/invite/accept/${token}`);
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || '接受邀請失敗');
    }
  },
);

const initialState: CountdownState = {
  items: [],
  selected: null,
  status: 'idle',
  detailStatus: 'idle',
  error: null,
  detailError: null,
  assignments: [],
  receivers: [],
  receiversStatus: 'idle',
};

const countdownSlice = createSlice({
  name: 'countdowns',
  initialState,
  reducers: {
    clearCountdownSelection(state) {
      state.selected = null;
      state.assignments = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCreatorCountdowns.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCreatorCountdowns.fulfilled, (state, action: PayloadAction<Countdown[]>) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchCreatorCountdowns.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) || null;
      })
      .addCase(fetchCountdownDetail.pending, (state) => {
        state.detailStatus = 'loading';
        state.detailError = null;
      })
      .addCase(fetchCountdownDetail.fulfilled, (state, action) => {
        state.detailStatus = 'succeeded';
        state.selected = action.payload.countdown || action.payload;
        state.assignments = action.payload.assignments || [];
      })
      .addCase(fetchCountdownDetail.rejected, (state, action) => {
        state.detailStatus = 'failed';
        state.detailError = (action.payload as string) || null;
      })
      .addCase(createCountdown.fulfilled, (state, action: PayloadAction<Countdown>) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateCountdown.fulfilled, (state, action: PayloadAction<Countdown>) => {
        state.selected = action.payload;
        state.items = state.items.map((item) => (item.id === action.payload.id ? action.payload : item));
      })
      .addCase(assignReceivers.fulfilled, (state, action) => {
        state.assignments = action.payload.assignments;
        state.items = state.items.map((item) => (item.id === action.payload.countdown.id ? action.payload.countdown : item));
      })
      .addCase(deleteCountdown.fulfilled, (state, action: PayloadAction<{ id: string }>) => {
        state.items = state.items.filter((item) => item.id !== action.payload.id);
        if (state.selected?.id === action.payload.id) {
          state.selected = null;
          state.assignments = [];
        }
      })
      .addCase(fetchReceivers.pending, (state) => {
        state.receiversStatus = 'loading';
      })
      .addCase(fetchReceivers.fulfilled, (state, action) => {
        state.receiversStatus = 'succeeded';
        state.receivers = action.payload;
      })
      .addCase(fetchReceivers.rejected, (state) => {
        state.receiversStatus = 'failed';
      })
      .addCase(removeReceiver.fulfilled, (state, action: PayloadAction<{ receiverId: string }>) => {
        state.receivers = state.receivers.filter((r) => r.receiverId !== action.payload.receiverId);
      });
  },
});

export const { clearCountdownSelection } = countdownSlice.actions;
export default countdownSlice.reducer;

