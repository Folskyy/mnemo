import { useState, useEffect } from "react";

export type TimerMode = "focus" | "pause";

export interface TimerState {
  mode: TimerMode;
  isRunning: boolean;
  remainingSeconds: number;
  targetEndTime: number | null;
  accumulatedStudyTime: number; // in seconds
  accumulatedPauseTime: number; // in seconds;
  lastTickTime: number | null;
}

const FOCUS_DURATION = 25 * 60; // 25 minutes in seconds
const PAUSE_DURATION = 5 * 60;  // 5 minutes in seconds
const STORAGE_KEY = "mnemo_pomodoro_state";

export function usePomodoroTimer() {
  const [state, setState] = useState<TimerState>({
    mode: "focus",
    isRunning: false,
    remainingSeconds: FOCUS_DURATION,
    targetEndTime: null,
    accumulatedStudyTime: 0,
    accumulatedPauseTime: 0,
    lastTickTime: null,
  });

  const [isLoaded, setIsLoaded] = useState(false);

  // Helper to safely write to localStorage
  const saveToStorage = (currentState: TimerState) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
      } catch (err) {
        console.error("localStorage is unavailable or full", err);
      }
    }
  };

  // 1. Initial State Loading on Mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as TimerState;
          
          // Re-sync if it was running
          if (parsed.isRunning && parsed.targetEndTime) {
            const now = Date.now();
            const diff = Math.max(0, Math.round((parsed.targetEndTime - now) / 1000));
            
            if (diff > 0) {
              // Still running: calculate accumulated time since last tick
              const lastTick = parsed.lastTickTime || (parsed.targetEndTime - parsed.remainingSeconds * 1000);
              const elapsed = Math.max(0, Math.round((now - lastTick) / 1000));
              const studyInc = parsed.mode === "focus" ? elapsed : 0;
              const pauseInc = parsed.mode === "pause" ? elapsed : 0;

              const syncedState = {
                ...parsed,
                remainingSeconds: diff,
                lastTickTime: now,
                accumulatedStudyTime: parsed.accumulatedStudyTime + studyInc,
                accumulatedPauseTime: parsed.accumulatedPauseTime + pauseInc,
              };
              setState(syncedState);
              saveToStorage(syncedState);
            } else {
              // Expired while away: add the remaining seconds of that cycle to the counters
              const remaining = parsed.remainingSeconds;
              const studyInc = parsed.mode === "focus" ? remaining : 0;
              const pauseInc = parsed.mode === "pause" ? remaining : 0;

              const nextMode = parsed.mode === "focus" ? "pause" : "focus";
              const nextDuration = nextMode === "focus" ? FOCUS_DURATION : PAUSE_DURATION;

              const expiredState = {
                ...parsed,
                mode: nextMode,
                isRunning: false,
                remainingSeconds: nextDuration,
                targetEndTime: null,
                lastTickTime: null,
                accumulatedStudyTime: parsed.accumulatedStudyTime + studyInc,
                accumulatedPauseTime: parsed.accumulatedPauseTime + pauseInc,
              };
              setState(expiredState);
              saveToStorage(expiredState);
            }
          } else {
            setState(parsed);
          }
        }
      } catch (err) {
        console.error("Failed to load pomodoro state from localStorage", err);
      } finally {
        setIsLoaded(true);
      }
    } else {
      setIsLoaded(true);
    }
  }, []);

  // 2. Timer Loop (1 second interval)
  useEffect(() => {
    if (!state.isRunning || !isLoaded) return;

    const timerInterval = setInterval(() => {
      setState((prev) => {
        if (!prev.isRunning || !prev.targetEndTime) return prev;

        const now = Date.now();
        const diff = Math.max(0, Math.round((prev.targetEndTime - now) / 1000));

        if (diff <= 0) {
          // Finished the cycle! Add the full remaining time of this cycle
          const remaining = prev.remainingSeconds;
          const studyInc = prev.mode === "focus" ? remaining : 0;
          const pauseInc = prev.mode === "pause" ? remaining : 0;

          const nextMode = prev.mode === "focus" ? "pause" : "focus";
          const nextDuration = nextMode === "focus" ? FOCUS_DURATION : PAUSE_DURATION;

          // Sound effect
          try {
            const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-200.wav");
            audio.volume = 0.4;
            audio.play();
          } catch (e) {
            // Audio blocked by browser policy
          }

          const completedState = {
            ...prev,
            mode: nextMode,
            isRunning: false,
            remainingSeconds: nextDuration,
            targetEndTime: null,
            lastTickTime: null,
            accumulatedStudyTime: prev.accumulatedStudyTime + studyInc,
            accumulatedPauseTime: prev.accumulatedPauseTime + pauseInc,
          };
          saveToStorage(completedState);
          return completedState;
        }

        // Increment time based on actual elapsed millisecond delta
        const lastTick = prev.lastTickTime || (prev.targetEndTime - prev.remainingSeconds * 1000);
        const elapsed = Math.max(0, Math.round((now - lastTick) / 1000));
        const studyInc = prev.mode === "focus" ? elapsed : 0;
        const pauseInc = prev.mode === "pause" ? elapsed : 0;

        const updatedState = {
          ...prev,
          remainingSeconds: diff,
          lastTickTime: now,
          accumulatedStudyTime: prev.accumulatedStudyTime + studyInc,
          accumulatedPauseTime: prev.accumulatedPauseTime + pauseInc,
        };
        saveToStorage(updatedState);
        return updatedState;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [state.isRunning, isLoaded]);

  // 3. Tab Focus & Page Visibility Change Synchronization
  useEffect(() => {
    if (!isLoaded) return;

    const syncTimer = () => {
      setState((prev) => {
        if (!prev.isRunning || !prev.targetEndTime) return prev;

        const now = Date.now();
        const diff = Math.max(0, Math.round((prev.targetEndTime - now) / 1000));

        if (diff > 0) {
          const lastTick = prev.lastTickTime || (prev.targetEndTime - prev.remainingSeconds * 1000);
          const elapsed = Math.max(0, Math.round((now - lastTick) / 1000));
          const studyInc = prev.mode === "focus" ? elapsed : 0;
          const pauseInc = prev.mode === "pause" ? elapsed : 0;

          const updatedState = {
            ...prev,
            remainingSeconds: diff,
            lastTickTime: now,
            accumulatedStudyTime: prev.accumulatedStudyTime + studyInc,
            accumulatedPauseTime: prev.accumulatedPauseTime + pauseInc,
          };
          saveToStorage(updatedState);
          return updatedState;
        } else {
          // Expired while backgrounded
          const remaining = prev.remainingSeconds;
          const studyInc = prev.mode === "focus" ? remaining : 0;
          const pauseInc = prev.mode === "pause" ? remaining : 0;

          const nextMode = prev.mode === "focus" ? "pause" : "focus";
          const nextDuration = nextMode === "focus" ? FOCUS_DURATION : PAUSE_DURATION;

          const expiredState = {
            ...prev,
            mode: nextMode,
            isRunning: false,
            remainingSeconds: nextDuration,
            targetEndTime: null,
            lastTickTime: null,
            accumulatedStudyTime: prev.accumulatedStudyTime + studyInc,
            accumulatedPauseTime: prev.accumulatedPauseTime + pauseInc,
          };
          saveToStorage(expiredState);
          return expiredState;
        }
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncTimer();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", syncTimer);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", syncTimer);
    };
  }, [isLoaded]);

  // 4. Exposed Control Functions
  const startTimer = () => {
    setState((prev) => {
      if (prev.isRunning) return prev;
      const now = Date.now();
      const target = now + prev.remainingSeconds * 1000;
      const updated = {
        ...prev,
        isRunning: true,
        targetEndTime: target,
        lastTickTime: now,
      };
      saveToStorage(updated);
      return updated;
    });
  };

  const pauseTimer = () => {
    setState((prev) => {
      if (!prev.isRunning) return prev;
      // When pausing, accumulate time elapsed up to this moment
      const now = Date.now();
      const lastTick = prev.lastTickTime || (prev.targetEndTime ? (prev.targetEndTime - prev.remainingSeconds * 1000) : now);
      const elapsed = Math.max(0, Math.round((now - lastTick) / 1000));
      const studyInc = prev.mode === "focus" ? elapsed : 0;
      const pauseInc = prev.mode === "pause" ? elapsed : 0;

      const updated = {
        ...prev,
        isRunning: false,
        targetEndTime: null,
        lastTickTime: null,
        accumulatedStudyTime: prev.accumulatedStudyTime + studyInc,
        accumulatedPauseTime: prev.accumulatedPauseTime + pauseInc,
      };
      saveToStorage(updated);
      return updated;
    });
  };

  const resetTimer = () => {
    setState((prev) => {
      const updated = {
        ...prev,
        isRunning: false,
        remainingSeconds: prev.mode === "focus" ? FOCUS_DURATION : PAUSE_DURATION,
        targetEndTime: null,
        lastTickTime: null,
      };
      saveToStorage(updated);
      return updated;
    });
  };

  const switchMode = (newMode: TimerMode) => {
    setState((prev) => {
      const updated = {
        ...prev,
        mode: newMode,
        isRunning: false,
        remainingSeconds: newMode === "focus" ? FOCUS_DURATION : PAUSE_DURATION,
        targetEndTime: null,
        lastTickTime: null,
      };
      saveToStorage(updated);
      return updated;
    });
  };

  const clearTimerState = () => {
    const defaultState: TimerState = {
      mode: "focus",
      isRunning: false,
      remainingSeconds: FOCUS_DURATION,
      targetEndTime: null,
      accumulatedStudyTime: 0,
      accumulatedPauseTime: 0,
      lastTickTime: null,
    };
    setState(defaultState);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return {
    state,
    startTimer,
    pauseTimer,
    resetTimer,
    switchMode,
    clearTimerState,
    isLoaded,
  };
}
