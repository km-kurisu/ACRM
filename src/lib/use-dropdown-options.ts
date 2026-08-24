"use client";

import { useCallback, useEffect, useState } from "react";
import { listDropdownOptions } from "@/actions";
import { DEFAULT_OPTIONS, type DropdownFieldKey } from "@/lib/dropdown-options";

type OptionsMap = Record<DropdownFieldKey, string[]>;

let cache: OptionsMap | null = null;

export function useDropdownOptions() {
  const [options, setOptions] = useState<OptionsMap>(cache ?? DEFAULT_OPTIONS);
  const [loaded, setLoaded] = useState(cache != null);

  // Initial fetch is wired as a promise chain so no setState is reached
  // synchronously from the effect body (react-hooks/set-state-in-effect).
  useEffect(() => {
    if (cache) return;
    listDropdownOptions()
      .then((data) => {
        cache = data;
        setOptions(data);
      })
      .catch(() => {
        /* keep serving defaults */
      })
      .finally(() => {
        setLoaded(true);
      });
  }, []);

  const reload = useCallback(async () => {
    try {
      const data = await listDropdownOptions();
      cache = data;
      setOptions(data);
    } catch {
      /* keep serving defaults */
    } finally {
      setLoaded(true);
    }
  }, []);

  return { options, loaded, reload };
}

export function pickOption(list: string[], preferred: string): string {
  if (list.length === 0) return preferred;
  return list.includes(preferred) ? preferred : list[0];
}
