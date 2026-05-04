import { useEffect, useRef } from 'react';
import type { SimSpeed } from '../types';

function intervalMsForSpeed(speed: SimSpeed): number {
  switch (speed) {
    case 'Slow':
      return 1000;
    case 'Normal':
      return 500;
    case 'Fast':
      return 100;
    default: {
      const _e: never = speed;
      return _e;
    }
  }
}

export function useTimer(
  running: boolean,
  paused: boolean,
  speed: SimSpeed,
  onTick: () => void
): void {
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    if (!running || paused) return undefined;

    const id = window.setInterval(() => {
      onTickRef.current();
    }, intervalMsForSpeed(speed));

    return () => {
      window.clearInterval(id);
    };
  }, [running, paused, speed]);
}
