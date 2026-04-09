'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfile } from '@/lib/types';
import { guestUser, returningUser, firstTimeUser } from '@/lib/mock-data';

interface UserStore {
  profile: UserProfile;
  setMode: (mode: 'guest' | 'first-time' | 'returning') => void;
  markPaymentCompleted: (method: string) => void;
}

export const useUser = create<UserStore>()(
  persist(
    (set) => ({
      profile: guestUser,

      setMode: (mode) => {
        switch (mode) {
          case 'returning':
            set({ profile: returningUser });
            break;
          case 'first-time':
            set({ profile: firstTimeUser });
            break;
          default:
            set({ profile: guestUser });
        }
      },

      markPaymentCompleted: (method) => {
        set((state) => ({
          profile: {
            ...state.profile,
            previousPaymentMethod: method,
          },
        }));
      },
    }),
    { name: 'hot-topic-user' }
  )
);
