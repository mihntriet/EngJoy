import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const normalizeAuthUser = (user) => {
  if (!user) return null;
  return {
    ...user,
    displayName: user.displayName ?? user.display_name ?? '',
    avatarUrl: user.avatarUrl ?? user.avatar_url ?? null,
    englishLevel: user.englishLevel ?? user.english_level ?? null,
    learningGoal: user.learningGoal ?? user.learning_goal ?? null,
    dailyGoal: user.dailyGoal ?? user.daily_goal ?? null,
    profileCompleted: user.profileCompleted ?? user.profile_completed ?? false,
  };
};

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user: normalizeAuthUser(user), accessToken, refreshToken, isAuthenticated: true }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      setUser: (user) => set({ user: normalizeAuthUser(user) }),

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
