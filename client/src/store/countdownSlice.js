import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../api/client';

export const fetchCreatorCountdowns = createAsyncThunk(
  'countdowns/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/countdowns');
      return data.items || [];
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || '無法取得倒數資訊');
    }
  },
);

export const fetchCountdownDetail = createAsyncThunk(
  'countdowns/fetchDetail',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/countdowns/${id}`);
      return data;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || '找不到倒數內容');
    }
  },
);

export const createCountdown = createAsyncThunk(
  'countdowns/create',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/countdowns', payload);
      return data.countdown;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || '建立倒數失敗');
    }
  },
);

export const updateCountdown = createAsyncThunk(
  'countdowns/update',
  async ({ id, data: updates }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/countdowns/${id}`, updates);
      return data.countdown;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || '更新倒數失敗');
    }
  },
);

export const assignReceivers = createAsyncThunk(
  'countdowns/assign',
  async ({ id, receiverIds = [], receiverEmails = [] }, { rejectWithValue }) => {
    const payload = {};
    if (receiverIds.length) payload.receiverIds = receiverIds;
    if (receiverEmails.length) payload.receiverEmails = receiverEmails;
    try {
      const { data } = await api.post(`/countdowns/${id}/assign`, payload);
      return data;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || '指派接收者失敗');
    }
  },
);

export const deleteCountdown = createAsyncThunk(
  'countdowns/delete',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.delete(`/countdowns/${id}`);
      return data;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || '刪除倒數失敗');
    }
  },
);

const initialState = {
  items: [],
  selected: null,
  status: 'idle',
  detailStatus: 'idle',
  error: null,
  detailError: null,
  assignments: [],
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
      .addCase(fetchCreatorCountdowns.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchCreatorCountdowns.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
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
        state.detailError = action.payload;
      })
      .addCase(createCountdown.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateCountdown.fulfilled, (state, action) => {
        state.selected = action.payload;
        state.items = state.items.map((item) => (item.id === action.payload.id ? action.payload : item));
      })
      .addCase(assignReceivers.fulfilled, (state, action) => {
        state.assignments = action.payload.assignments;
        state.items = state.items.map((item) => (item.id === action.payload.countdown.id ? action.payload.countdown : item));
      })
      .addCase(deleteCountdown.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload.id);
        if (state.selected?.id === action.payload.id) {
          state.selected = null;
          state.assignments = [];
        }
      });
  },
});

export const { clearCountdownSelection } = countdownSlice.actions;
export default countdownSlice.reducer;
