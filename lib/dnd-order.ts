import { useEffect, useState, useCallback } from "react";

/**
 * Persist a custom ordering of a known set of IDs to localStorage.
 * - Returns the ordered list with any new (unknown) IDs appended at the end.
 * - Removes IDs that no longer exist.
 */
export function useOrderedIds(storageKey: string, allIds: string[]) {
  const [order, setOrder] = useState<string[]>(allIds);

  // Load order from storage on mount and when allIds set changes
  useEffect(() => {
    let stored: string[] = [];
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) stored = parsed.filter((x) => typeof x === "string");
      }
    } catch {}
    const known = new Set(allIds);
    const kept = stored.filter((id) => known.has(id));
    const seen = new Set(kept);
    const appended = allIds.filter((id) => !seen.has(id));
    setOrder([...kept, ...appended]);
  }, [storageKey, allIds.join("|")]);

  const setAndPersist = useCallback(
    (next: string[]) => {
      setOrder(next);
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
    },
    [storageKey],
  );

  return [order, setAndPersist] as const;
}
