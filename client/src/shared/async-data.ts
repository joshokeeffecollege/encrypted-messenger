import { useEffect, useEffectEvent, useRef, useState } from "react";

export function getErrorText(error: unknown, fallbackMessage: string) {
  // keep the error text simple
  return error instanceof Error ? error.message : fallbackMessage;
}

export function useAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
  fallbackMessage: string,
) {
  // use this for one async action
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const actionEvent = useEffectEvent(action);

  async function run(...args: TArgs) {
    // clear old error before trying again
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
  // use this for screen data
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
    // can reload by hand if needed
    setLoading(true);
    setError("");

    try {
      const nextValue = await loadEvent();

      if (mountedRef.current) {
        setValue((currentValue) =>
          isEqual?.(currentValue, nextValue) ? currentValue : nextValue,
        );
        hasLoadedRef.current = true;
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
      // this does the real fetch
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

    // keep polling if this screen asked for it
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
