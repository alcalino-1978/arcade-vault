import { useEffect, useRef } from 'react';

// Keeps a ref in sync with the latest value without re-running the game loop effect.
export function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}
