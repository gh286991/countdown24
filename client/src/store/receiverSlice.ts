import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import api from '../api/client';

export type VoucherRedemptionStatus = 'pending' | 'confirmed' | 'rejected';

export interface VoucherRedemption {
  id: string;
  countdownId: string;
  assignmentId: string;
  day: number;
  receiverId: string;
  status: VoucherRedemptionStatus;
  requestedAt: string;
  confirmedAt?: string | null;
  rejectedAt?: string | null;
  note?: string;
  creatorNote?: string;
}

interface ReceiverState {
  inbox: any[];
  selected: any | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  experienceStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  dayStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  dayContent: any | null;
  error: string | null;
  dayError: string | null;
  redemptions: VoucherRedemption[];
  redemptionsStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  redemptionError: string | null;
}

export const fetchReceiverInbox = createAsyncThunk(
  'receiver/fetchInbox',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/receiver/inbox');
      return data.items || [];
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || '無法取得收禮清單');
    }
  },
);

export const fetchReceiverExperience = createAsyncThunk(
  'receiver/fetchExperience',
  async (assignmentId: string, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/receiver/countdowns/${assignmentId}`);
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || '查不到指定的禮物');
    }
  },
);

export const fetchReceiverDayContent = createAsyncThunk(
  'receiver/fetchDayContent',
  async ({ assignmentId, day }: { assignmentId: string; day: number }, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/receiver/countdowns/${assignmentId}/days/${day}`);
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || '無法取得此日內容');
    }
  },
);

export const unlockDayWithQr = createAsyncThunk(
  'receiver/unlockDayWithQr',
  async ({ assignmentId, qrToken }: { assignmentId: string; qrToken: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/receiver/unlock-day', { assignmentId, qrToken });
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || '解鎖失敗');
    }
  },
);

// 請求兌換兌換卷
export const requestVoucherRedemption = createAsyncThunk(
  'receiver/requestVoucherRedemption',
  async ({ assignmentId, day, note }: { assignmentId: string; day: number; note?: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/receiver/countdowns/${assignmentId}/vouchers/${day}/redeem`, { note });
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || '兌換請求失敗');
    }
  },
);

// 獲取接收者的兌換紀錄
export const fetchReceiverRedemptions = createAsyncThunk(
  'receiver/fetchRedemptions',
  async (assignmentId: string, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/receiver/countdowns/${assignmentId}/redemptions`);
      return data.redemptions || [];
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || '無法取得兌換紀錄');
    }
  },
);

const initialState: ReceiverState = {
  inbox: [],
  selected: null,
  status: 'idle',
  experienceStatus: 'idle',
  dayStatus: 'idle',
  dayContent: null,
  error: null,
  dayError: null,
  redemptions: [],
  redemptionsStatus: 'idle',
  redemptionError: null,
};

const receiverSlice = createSlice({
  name: 'receiver',
  initialState,
  reducers: {
    clearExperience(state) {
      state.selected = null;
      state.dayContent = null;
      state.dayStatus = 'idle';
      state.dayError = null;
    },
    clearDayContent(state) {
      state.dayContent = null;
      state.dayStatus = 'idle';
      state.dayError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReceiverInbox.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchReceiverInbox.fulfilled, (state, action: PayloadAction<any[]>) => {
        state.status = 'succeeded';
        state.inbox = action.payload;
      })
      .addCase(fetchReceiverInbox.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) || null;
      })
      .addCase(fetchReceiverExperience.pending, (state) => {
        state.experienceStatus = 'loading';
      })
      .addCase(fetchReceiverExperience.fulfilled, (state, action) => {
        state.experienceStatus = 'succeeded';
        state.selected = action.payload;
        state.dayContent = null;
        state.dayStatus = 'idle';
        state.dayError = null;
      })
      .addCase(fetchReceiverExperience.rejected, (state, action) => {
        state.experienceStatus = 'failed';
        state.error = (action.payload as string) || null;
      })
      .addCase(fetchReceiverDayContent.pending, (state) => {
        state.dayStatus = 'loading';
        state.dayError = null;
      })
      .addCase(fetchReceiverDayContent.fulfilled, (state, action) => {
        state.dayStatus = 'succeeded';
        state.dayContent = action.payload;
      })
      .addCase(fetchReceiverDayContent.rejected, (state, action) => {
        state.dayStatus = 'failed';
        state.dayError = (action.payload as string) || null;
      })
      // 兌換紀錄
      .addCase(fetchReceiverRedemptions.pending, (state) => {
        state.redemptionsStatus = 'loading';
      })
      .addCase(fetchReceiverRedemptions.fulfilled, (state, action) => {
        state.redemptionsStatus = 'succeeded';
        state.redemptions = action.payload;
      })
      .addCase(fetchReceiverRedemptions.rejected, (state, action) => {
        state.redemptionsStatus = 'failed';
        state.redemptionError = (action.payload as string) || null;
      })
      // 請求兌換
      .addCase(requestVoucherRedemption.fulfilled, (state, action) => {
        const redemption = action.payload.redemption;
        if (redemption) {
          const index = state.redemptions.findIndex((r) => r.id === redemption.id);
          if (index >= 0) {
            state.redemptions[index] = redemption;
          } else {
            state.redemptions.push(redemption);
          }
        }
      });
  },
});

export const { clearExperience, clearDayContent } = receiverSlice.actions;
export default receiverSlice.reducer;

