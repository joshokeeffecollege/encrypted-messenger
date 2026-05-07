import { useEffect, useEffectEvent, useRef, useState } from "react";

export function getErrorText(error: unknown, fallbackMessage: string) {
  // This keeps error messages simple for components that do not care about error types.
  return error instanceof Error ? error.message : fallbackMessage;
}

export function useAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
  fallbackMessage: string,
) {
  // This hook is for button clicks or form submits that run one async action.
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const actionEvent = useEffectEvent(action);

  async function run(...args: TArgs) {
    // We clear old errors before each new attempt.
    setLoading(true);
    setError("");

    try {
      return await actionEvent(...args);
    } catch (error) {
      setError(getErrorText(error, fallbackMessage));
      throw error;
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    error,
    setError,
    clearError() {
      setError("");
    },
    run,
  };
}

interface UseAsyncValueOptions<T> {
  initialValue: T;
  load: () => Promise<T>;
  deps: readonly unknown[];
  fallbackMessage: string;
  pollMs?: number;
  isEqual?: (currentValue: T, nextValue: T) => boolean;
}

export function useData<T>({
  initialValue,
  load,
  deps,
  fallbackMessage,
  pollMs,
  isEqual,
}: UseAsyncValueOptions<T>) {
  // This hook loads data for a screen and can also poll on an interval.
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const mountedRef = useRef(true);
  const initialValueRef = useRef(initialValue);
  const hasLoadedRef = useRef(false);
  const loadEvent = useEffectEvent(load);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function refresh() {
    // Components use this when the user manually clicks refresh.
    setLoading(true);
    setError("");

    try {
      const nextValue = await loadEvent();

      if (mountedRef.current) {
        setValue(nextValue);
      }

      return nextValue;
    } catch (error) {
      if (mountedRef.current) {
        setError(getErrorText(error, fallbackMessage));
      }

      throw error;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadValue(showLoading: boolean) {
      // This is the shared "fetch the latest screen data" function.
      if (showLoading) {
        setLoading(true);
      }

      try {
        const nextValue = await loadEvent();

        if (cancelled) {
          return;
        }

        setValue((currentValue) =>
          isEqual?.(currentValue, nextValue) ? currentValue : nextValue,
        );
        setError("");
        hasLoadedRef.current = true;
      } catch (error) {
        if (!cancelled) {
          setError(getErrorText(error, fallbackMessage));
        }
      } finally {
        if (!cancelled && showLoading) {
          setLoading(false);
        }
      }
    }

    void loadValue(true);

    // If pollMs exists, we repeat the same load on a timer.
    if (!pollMs) {
      return () => {
        cancelled = true;
      };
    }

    const interval = setInterval(() => {
      void loadValue(!hasLoadedRef.current);
    }, pollMs);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fallbackMessage, loadEvent, pollMs, ...deps]);

  return {
    value,
    setValue,
    loading,
    error,
    clearError() {
      setError("");
    },
    refresh,
    reset() {
      setValue(initialValueRef.current);
      setError("");
    },
  };
}
