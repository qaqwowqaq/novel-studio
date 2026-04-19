import { useCallback, useEffect, useRef, useState } from 'react';

const WINDOW_MS = 60_000;

export interface TypingSpeedApi {
  speed: number;
  recordTyping: (delta: number) => void;
  reset: () => void;
}

/**
 * Rolling typing-speed meter. Only counts deltas explicitly reported via
 * recordTyping(); paste / import / AI insertion paths must not call it.
 */
export function useTypingSpeed(): TypingSpeedApi {
  const [speed, setSpeed] = useState(0);
  const eventsRef = useRef<Array<{ t: number; delta: number }>>([]);

  const computeSpeed = useCallback(() => {
    const now = Date.now();
    const cutoff = now - WINDOW_MS;
    const arr = eventsRef.current.filter((e) => e.t >= cutoff);
    eventsRef.current = arr;
    if (arr.length === 0) {
      setSpeed(0);
      return;
    }
    const totalDelta = arr.reduce((s, e) => s + e.delta, 0);
    const spanSec = Math.max(1, (now - arr[0].t) / 1000);
    setSpeed(Math.max(0, Math.round((totalDelta / spanSec) * 60)));
  }, []);

  const recordTyping = useCallback((delta: number) => {
    if (delta <= 0) return;
    eventsRef.current.push({ t: Date.now(), delta });
    computeSpeed();
  }, [computeSpeed]);

  const reset = useCallback(() => {
    eventsRef.current = [];
    setSpeed(0);
  }, []);

  useEffect(() => {
    const id = window.setInterval(computeSpeed, 2000);
    return () => window.clearInterval(id);
  }, [computeSpeed]);

  return { speed, recordTyping, reset };
}
