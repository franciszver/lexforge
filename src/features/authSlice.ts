import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

/**
 * Auth state slice for managing authentication status.
 * Integrates with AWS Cognito via Amplify.
 */

interface AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  user: {
    email: string;
    userId: string;
  } | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  isAdmin: false,
  user: null,
  loading: true,
  error: null,
};

// Check current session on app load
export const checkSession = createAsyncThunk(
  'auth/checkSession',
  async (_, { rejectWithValue }) => {
    try {
      const user = await getCurrentUser();
      const session = await fetchAuthSession();

      // Check if user is admin (based on Cognito groups or custom attribute)
      const groups = session.tokens?.accessToken?.payload['cognito:groups'] as string[] | undefined;
      const isAdmin = groups?.includes('admin') ?? false;

      return {
        email: user.signInDetails?.loginId || user.username,
        userId: user.userId,
        isAdmin,
      };
    } catch {
      return rejectWithValue('Not authenticated');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthenticated: (state, action: PayloadAction<{ email: string; userId: string; isAdmin?: boolean }>) => {
      state.isAuthenticated = true;
      state.user = {
        email: action.payload.email,
        userId: action.payload.userId,
      };
      state.isAdmin = action.payload.isAdmin ?? false;
      state.loading = false;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.isAdmin = false;
      state.user = null;
      state.loading = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkSession.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = {
          email: action.payload.email,
          userId: action.payload.userId,
        };
        state.isAdmin = action.payload.isAdmin;
        state.loading = false;
      })
      .addCase(checkSession.rejected, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.isAdmin = false;
        state.loading = false;
      });
  },
});

export const { setAuthenticated, logout, setLoading, clearError } = authSlice.actions;
export default authSlice.reducer;

