import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      setUser: (user) => set({ user }),

      logout: async () => {
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
        try {
          const { useProgressStore } = await import('./progressStore.js');
          useProgressStore.getState().resetProgress();
        } catch (err) {
          console.warn('Failed to reset progress on logout:', err);
        }
      },
    }),
    {
      name: 'engjoy-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
