import { useCallback, useRef } from "react";
import { chatService } from "../services/api";

const IDLE_TIMEOUT = 3 * 60 * 1000; // 3 menit

export function useIdleTimer(
  idleCount: number,
  setIdleCount: (count: number) => void
) {
  const idleTimerRef = useRef<number | null>(null);
  const lastResetTimeRef = useRef<number>(0);
  const minResetInterval = 1000; // Minimum 1 second between resets

  const resetIdleTimer = useCallback(() => {
    const now = Date.now();

    // Prevent too frequent resets
    if (now - lastResetTimeRef.current < minResetInterval) {
      return;
    }

    lastResetTimeRef.current = now;

    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    idleTimerRef.current = window.setTimeout(async () => {
      const newIdleCount = idleCount + 1;
      setIdleCount(newIdleCount);

      try {
        await chatService.triggerProactive(newIdleCount);
      } catch (error) {
        console.error("Error triggering proactive message:", error);
      }
    }, IDLE_TIMEOUT);
  }, [idleCount, setIdleCount]);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  return { resetIdleTimer, clearIdleTimer };
}
