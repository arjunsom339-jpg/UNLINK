import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * AUTH STORE (Zustand + localStorage persistence)
 * Central client-side authentication and role state store.
 */
const useAuthStore = create(
  persist(
    (set, get) => ({
      user:         null,
      accessToken:  null,
      refreshToken: null,
      isLoading:    false,

      setAuth: ({ user, accessToken, refreshToken }) => {
        if (accessToken) localStorage.setItem('unilink_access_token', accessToken);
        if (refreshToken) localStorage.setItem('unilink_refresh_token', refreshToken);
        set({ user, accessToken, refreshToken });
      },

      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null,
      })),

      logout: () => {
        const refreshToken = localStorage.getItem('unilink_refresh_token');
        localStorage.removeItem('unilink_access_token');
        localStorage.removeItem('unilink_refresh_token');
        set({ user: null, accessToken: null, refreshToken: null });
        return refreshToken;
      },

      setLoading: (isLoading) => set({ isLoading }),

      // Role Selectors
      isAuthenticated: () => !!get().user && !!get().accessToken,
      isStudent:       () => get().user?.role === 'student',
      isTeacher:       () => get().user?.role === 'teacher',
      isAdmin:         () => get().user?.role === 'admin',

      // Account State Selectors
      isPendingVerification: () => {
        const u = get().user;
        if (!u) return false;
        return u.accountStatus === 'pending' || u.accountStatus === 'pending_verification' || (u.role !== 'admin' && !u.isAdminVerified);
      },
      isSuspended: () => get().user?.accountStatus === 'suspended',
      isBanned:    () => get().user?.accountStatus === 'banned',
      isVerified:  () => {
        const u = get().user;
        if (!u) return false;
        if (u.role === 'admin') return true;
        return u.accountStatus === 'active' && u.isAdminVerified;
      },
    }),
    {
      name: 'unilink-auth',
      partialize: (state) => ({
        user:         state.user,
        accessToken:  state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

export default useAuthStore;
