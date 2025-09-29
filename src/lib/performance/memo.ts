import { useMemo, useRef } from 'react';

export function useStableMemo<T>(
  factory: () => T,
  deps: React.DependencyList
): T {
  const ref = useRef<{ deps: React.DependencyList; value: T }>();

  return useMemo(() => {
    if (!ref.current || !areEqual(ref.current.deps, deps)) {
      ref.current = { deps, value: factory() };
    }
    return ref.current.value;
  }, deps);
}

function areEqual(a: React.DependencyList, b: React.DependencyList): boolean {
  if (a.length !== b.length) return false;
  
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  
  return true;
}

export function useDeepMemo<T>(
  factory: () => T,
  deps: React.DependencyList
): T {
  return useMemo(() => {
    return factory();
  }, deps);
}
