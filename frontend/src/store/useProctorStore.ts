import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Violation {
  type: 'TAB_SWITCH' | 'FULLSCREEN_EXIT' | 'MINIMIZE';
  timestamp: string;
}

interface SessionData {
  strikes: number;
  violations: Violation[];
  isLockdown: boolean;
}

interface ProctorState {
  sessions: Record<string, SessionData>;
  addViolation: (hackathonId: string, type: Violation['type']) => void;
  resetProctoring: (hackathonId: string) => void;
  getSession: (hackathonId: string) => SessionData;
}

const DEFAULT_SESSION: SessionData = {
  strikes: 0,
  violations: [],
  isLockdown: false,
};

export const useProctorStore = create<ProctorState>()(
  persist(
    (set, get) => ({
      sessions: {},
      
      getSession: (hackathonId) => {
        return get().sessions[hackathonId] || DEFAULT_SESSION;
      },

      addViolation: (hackathonId, type) =>
        set((state) => {
          const currentSession = state.sessions[hackathonId] || { ...DEFAULT_SESSION };
          const newStrikes = currentSession.strikes + 1;
          const newViolations = [
            ...currentSession.violations,
            { type, timestamp: new Date().toISOString() },
          ];
          
          return {
            sessions: {
              ...state.sessions,
              [hackathonId]: {
                strikes: newStrikes,
                violations: newViolations,
                isLockdown: newStrikes >= 6,
              },
            },
          };
        }),

      resetProctoring: (hackathonId) =>
        set((state) => {
          const { [hackathonId]: _, ...otherSessions } = state.sessions;
          return { sessions: otherSessions };
        }),
    }),
    {
      name: 'VeritaBox-proctor-storage-v2', // Updated name to avoid conflict with old schema
    }
  )
);
