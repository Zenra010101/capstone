import { useEffect, useRef } from "react";

/** Run effect immediately on mount; debounce subsequent dependency changes (e.g. search typing). */
export function useDebouncedEffect(
  effect: () => void | (() => void),
  deps: React.DependencyList,
  delayMs = 300
) {
  const isFirst = useRef(true);

  useEffect(() => {
    const wait = isFirst.current ? 0 : delayMs;
    isFirst.current = false;

    let cleanup: (() => void) | void;
    const id = window.setTimeout(() => {
      cleanup = effect();
    }, wait);

    return () => {
      window.clearTimeout(id);
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
