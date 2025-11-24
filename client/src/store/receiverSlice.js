import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../api/client';

export const fetchReceiverInbox = createAsyncThunk(
  'receiver/fetchInbox',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/receiver/inbox');
      return data.items || [];
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || '無法取得收禮清單');
    }
  },
);

export const fetchReceiverExperience = createAsyncThunk(
  'receiver/fetchExperience',
  async (assignmentId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/receiver/countdowns/${assignmentId}`);
      return data;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || '查不到指定的禮物');
    }
  },
);

const initialState = {
  inbox: [],
  selected: null,
  status: 'idle',
  experienceStatus: 'idle',
  error: null,
};

const receiverSlice = createSlice({
  name: 'receiver',
  initialState,
  reducers: {
    clearExperience(state) {
      state.selected = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReceiverInbox.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchReceiverInbox.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.inbox = action.payload;
      })
      .addCase(fetchReceiverInbox.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchReceiverExperience.pending, (state) => {
        state.experienceStatus = 'loading';
      })
      .addCase(fetchReceiverExperience.fulfilled, (state, action) => {
        state.experienceStatus = 'succeeded';
        state.selected = action.payload;
      })
      .addCase(fetchReceiverExperience.rejected, (state, action) => {
        state.experienceStatus = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearExperience } = receiverSlice.actions;
export default receiverSlice.reducer;
