import { useEffect, useCallback, useRef } from 'react';
import { useProctorStore } from '@/store/useProctorStore';
import { useSocket } from '@/contexts/SocketContext';
import { toast } from 'sonner';

const VIOLATION_COOLDOWN_MS = 5000; // one report per type per 5 seconds

export function useSecurityEnforcement(hackathonId: string, active = false) {
  const { addViolation, getSession } = useProctorStore();
  const { socket } = useSocket();
  const session = getSession(hackathonId);
  const strikes = session.strikes;
  // Track last violation time per type to prevent spam
  const lastViolationRef = useRef<Record<string, number>>({});

  const handleViolation = useCallback((type: 'TAB_SWITCH' | 'FULLSCREEN_EXIT' | 'MINIMIZE') => {
    const now = Date.now();
    const last = lastViolationRef.current[type] || 0;
    if (now - last < VIOLATION_COOLDOWN_MS) return; // cooldown
    lastViolationRef.current[type] = now;

    addViolation(hackathonId, type);

    if (socket?.connected) {
      socket.emit('proctor_violation', {
        hackathonId,
        type,
        details: `Violation at ${new Date().toLocaleTimeString()}`
      });
    }

    toast.error(`SECURITY BREACH: ${type.replace(/_/g, ' ')}`, {
      description: `Strike ${strikes + 1} of 6 recorded. Further violations will result in mission termination.`,
      duration: 5000,
    });
  }, [addViolation, hackathonId, strikes, socket]);

  const requestFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {}
  };

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {}
  };

  useEffect(() => {
    if (socket) {
      socket.emit('join_hackathon', hackathonId);
    }
  }, [hackathonId, socket]);

  useEffect(() => {
    if (!active) return;

    const handleVisibilityChange = () => {
      if (document.hidden) handleViolation('TAB_SWITCH');
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) handleViolation('FULLSCREEN_EXIT');
    };

    const handleWindowBlur = () => {
      handleViolation('MINIMIZE');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [active, hackathonId, handleViolation]);

  return { requestFullscreen, exitFullscreen, strikes };
}
