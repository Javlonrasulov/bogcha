import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AttendanceStatus } from '@bogcha/shared';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Davomat qoralamasi qurilmada saqlanadi: internet yo'q bo'lsa ham
 * belgilangan holatlar ilova qayta ochilganda yo'qolmaydi (TZ §41).
 */

export interface DraftEntry {
  status: AttendanceStatus;
  arrivedAt?: string;
  leftAt?: string;
  note?: string;
}

export type DraftMap = Record<string, DraftEntry>;

interface Draft {
  entries: DraftMap;
  /** Qoralama serverga yuborilganmi — yuborilgach tozalanadi. */
  updatedAt: string;
}

function storageKey(groupId: string, date: string): string {
  return `bogcha.attendanceDraft.${groupId}.${date}`;
}

export interface AttendanceDraft {
  entries: DraftMap;
  /** Qoralama diskdan o'qilgunicha `true`. */
  loading: boolean;
  dirty: boolean;
  set: (childId: string, entry: DraftEntry) => void;
  setMany: (entries: DraftMap) => void;
  clear: () => Promise<void>;
}

export function useAttendanceDraft(groupId: string | null, date: string): AttendanceDraft {
  const [entries, setEntries] = useState<DraftMap>({});
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const key = groupId ? storageKey(groupId, date) : null;
  // Yozish debounce'i: har bir tegishda AsyncStorage'ga yozmaslik uchun.
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setDirty(false);
    setEntries({});

    if (!key) {
      setLoading(false);
      return;
    }

    void AsyncStorage.getItem(key)
      .then((raw) => {
        if (!active || !raw) return;
        try {
          const parsed = JSON.parse(raw) as Draft;
          setEntries(parsed.entries ?? {});
          setDirty(Object.keys(parsed.entries ?? {}).length > 0);
        } catch {
          void AsyncStorage.removeItem(key);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [key]);

  const persist = useCallback(
    (next: DraftMap) => {
      if (!key) return;
      if (writeTimer.current) clearTimeout(writeTimer.current);
      writeTimer.current = setTimeout(() => {
        const draft: Draft = { entries: next, updatedAt: new Date().toISOString() };
        void AsyncStorage.setItem(key, JSON.stringify(draft));
      }, 400);
    },
    [key],
  );

  useEffect(() => {
    return () => {
      if (writeTimer.current) clearTimeout(writeTimer.current);
    };
  }, []);

  const set = useCallback(
    (childId: string, entry: DraftEntry) => {
      setEntries((current) => {
        const next = { ...current, [childId]: entry };
        setDirty(true);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const setMany = useCallback(
    (incoming: DraftMap) => {
      setEntries((current) => {
        const next = { ...current, ...incoming };
        setDirty(true);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const clear = useCallback(async () => {
    setEntries({});
    setDirty(false);
    if (writeTimer.current) clearTimeout(writeTimer.current);
    if (key) await AsyncStorage.removeItem(key);
  }, [key]);

  return { entries, loading, dirty, set, setMany, clear };
}
