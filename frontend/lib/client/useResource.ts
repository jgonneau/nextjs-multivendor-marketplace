"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/components/providers/SessionProvider";

type State<T> = { data: T | undefined; error: Error | undefined; loading: boolean };

/** Fetches `path` with the current session's token; pass null to skip. */
export function useResource<T>(path: string | null) {
  const { request } = useSession();
  const [state, setState] = useState<State<T>>({
    data: undefined,
    error: undefined,
    loading: Boolean(path),
  });

  const reload = useCallback(async () => {
    if (!path) {
      setState({ data: undefined, error: undefined, loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: undefined }));
    try {
      const data = await request<T>(path);
      setState({ data, error: undefined, loading: false });
    } catch (error) {
      setState((s) => ({ ...s, error: error as Error, loading: false }));
    }
  }, [path, request]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...state, reload };
}
