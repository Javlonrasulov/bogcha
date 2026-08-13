'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, CheckCheck, CloudOff, Save, WifiOff } from 'lucide-react';
import { AttendanceStatus } from '@bogcha/shared';
import { markAttendanceAction, type AttendanceEntryPayload } from '../../actions/attendance';
import { useAppDataOptional } from '../../../lib/app-data';
import { useT } from '../../../i18n/client';
import { cn, formatNumber, formatPercent, initials } from '../../../lib/utils';
import type { AttendanceBoard as BoardData } from '../../../lib/types';

const STATUS_ORDER: AttendanceStatus[] = [
  AttendanceStatus.PRESENT,
  AttendanceStatus.ABSENT_EXCUSED,
  AttendanceStatus.ABSENT_UNEXCUSED,
  AttendanceStatus.SICK,
  AttendanceStatus.ON_VACATION,
];

const STATUS_STYLE: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-success text-white ring-success',
  ABSENT_EXCUSED: 'bg-warning text-white ring-warning',
  ABSENT_UNEXCUSED: 'bg-danger text-white ring-danger',
  SICK: 'bg-accent text-white ring-accent',
  ON_VACATION: 'bg-info text-white ring-info',
};

const QUEUE_KEY = 'bogcha:attendance-queue';

interface QueuedBatch {
  groupId: string;
  date: string;
  entries: AttendanceEntryPayload[];
  idempotencyKey: string;
  queuedAt: string;
}

/**
 * Davomat belgilash ekrani. Internet uzilsa yozuv lokal navbatga tushadi va
 * ulanish qaytganda avtomatik yuboriladi (TZ §41).
 */
export function AttendanceBoard({
  board,
  canMark,
}: {
  board: BoardData;
  canMark: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const appData = useAppDataOptional();
  const [pending, startTransition] = useTransition();
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>(() =>
    Object.fromEntries(
      board.children.map((child) => [child.id, child.status ?? AttendanceStatus.PRESENT]),
    ),
  );
  const [message, setMessage] = useState<{ tone: 'ok' | 'error' | 'queued'; text: string } | null>(
    null,
  );
  const [online, setOnline] = useState(true);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setStatuses(
      Object.fromEntries(
        board.children.map((child) => [child.id, child.status ?? AttendanceStatus.PRESENT]),
      ),
    );
    setDirty(false);
  }, [board]);

  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => {
      setOnline(true);
      void flushQueue();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    void flushQueue();
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const counts = useMemo(() => {
    const result = { present: 0, excused: 0, unexcused: 0, sick: 0, vacation: 0 };
    for (const status of Object.values(statuses)) {
      if (status === AttendanceStatus.PRESENT) result.present += 1;
      else if (status === AttendanceStatus.ABSENT_EXCUSED) result.excused += 1;
      else if (status === AttendanceStatus.ABSENT_UNEXCUSED) result.unexcused += 1;
      else if (status === AttendanceStatus.SICK) result.sick += 1;
      else result.vacation += 1;
    }
    return result;
  }, [statuses]);

  const expected = board.children.length - counts.vacation;
  const rate = expected > 0 ? (counts.present / expected) * 100 : 0;

  const setStatus = (childId: string, status: AttendanceStatus) => {
    setStatuses((current) => ({ ...current, [childId]: status }));
    setDirty(true);
  };

  const markAllPresent = () => {
    setStatuses(
      Object.fromEntries(board.children.map((child) => [child.id, AttendanceStatus.PRESENT])),
    );
    setDirty(true);
  };

  const submit = () => {
    const entries: AttendanceEntryPayload[] = board.children.map((child) => ({
      childId: child.id,
      status: statuses[child.id] ?? AttendanceStatus.PRESENT,
    }));
    const payload: QueuedBatch = {
      groupId: board.group.id,
      date: board.date,
      entries,
      idempotencyKey: `${board.group.id}:${board.date}:${Date.now()}`,
      queuedAt: new Date().toISOString(),
    };

    if (!navigator.onLine) {
      enqueue(payload);
      setMessage({ tone: 'queued', text: t.attendance.offlineNotice });
      setDirty(false);
      return;
    }

    startTransition(async () => {
      const result = await markAttendanceAction(payload);
      if (result.ok) {
        setMessage({ tone: 'ok', text: t.common.saved });
        setDirty(false);
        await appData?.refresh();
        router.refresh();
      } else {
        enqueue(payload);
        setMessage({ tone: 'error', text: result.error ?? t.common.error });
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Jamlanma */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Chip label={t.attendance.statuses.PRESENT} value={counts.present} tone="success" />
          <Chip label={t.attendance.statuses.ABSENT_EXCUSED} value={counts.excused} tone="warning" />
          <Chip
            label={t.attendance.statuses.ABSENT_UNEXCUSED}
            value={counts.unexcused}
            tone="danger"
          />
          <Chip label={t.attendance.statuses.SICK} value={counts.sick} tone="accent" />
          <Chip label={t.attendance.statuses.ON_VACATION} value={counts.vacation} tone="info" />
          <span className="tabular text-sm font-semibold text-brand-strong">
            {formatPercent(rate)}
          </span>
        </div>
        {canMark ? (
          <div className="flex flex-wrap items-center gap-2">
            {!online ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-warning-soft px-2.5 py-1.5 text-xs text-warning">
                <WifiOff className="size-3.5" />
                {t.attendance.offlineNotice}
              </span>
            ) : null}
            <button
              type="button"
              onClick={markAllPresent}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-surface px-3 text-xs font-medium text-content-secondary ring-1 ring-inset ring-line transition-colors hover:bg-surface-muted hover:text-content"
            >
              <CheckCheck className="size-4" />
              {t.attendance.markAll}
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-xl px-3.5 text-sm font-medium text-white shadow-[var(--shadow-glow)] transition-all disabled:opacity-60',
                dirty ? 'bg-gradient-brand' : 'bg-success',
              )}
            >
              {pending ? (
                <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : dirty ? (
                <Save className="size-4" />
              ) : (
                <Check className="size-4" />
              )}
              {t.attendance.saveAttendance}
            </button>
          </div>
        ) : null}
      </div>

      {message ? (
        <p
          className={cn(
            'flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm',
            message.tone === 'ok'
              ? 'bg-success-soft text-success'
              : message.tone === 'queued'
                ? 'bg-warning-soft text-warning'
                : 'bg-danger-soft text-danger',
          )}
        >
          {message.tone === 'queued' ? <CloudOff className="size-4" /> : null}
          {message.text}
        </p>
      ) : null}

      {/* Bolalar ro'yxati */}
      <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {board.children.map((child) => {
          const status = statuses[child.id] ?? AttendanceStatus.PRESENT;
          return (
            <li
              key={child.id}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5 transition-shadow hover:shadow-soft"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-muted text-xs font-semibold text-content-secondary">
                {initials(child.fullName)}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-content">
                {child.fullName}
              </span>
              <span className="flex shrink-0 gap-1">
                {STATUS_ORDER.map((option) => (
                  <button
                    key={option}
                    type="button"
                    disabled={!canMark}
                    onClick={() => setStatus(child.id, option)}
                    title={t.attendance.statuses[option]}
                    aria-pressed={status === option}
                    className={cn(
                      'grid size-7 place-items-center rounded-lg text-[0.65rem] font-bold ring-1 ring-inset transition-all',
                      status === option
                        ? STATUS_STYLE[option]
                        : 'bg-surface-muted text-content-muted ring-line hover:text-content',
                      !canMark && 'cursor-default',
                    )}
                  >
                    {t.attendance.statuses[option].charAt(0)}
                  </button>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Chip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'success' | 'warning' | 'danger' | 'accent' | 'info';
}) {
  const style = {
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-danger-soft text-danger',
    accent: 'bg-brand-soft text-accent',
    info: 'bg-info-soft text-info',
  }[tone];
  return (
    <span
      className={cn('tabular inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs', style)}
    >
      {label}
      <span className="font-semibold">{formatNumber(value)}</span>
    </span>
  );
}

function enqueue(batch: QueuedBatch): void {
  try {
    const queue = readQueue().filter(
      (item) => !(item.groupId === batch.groupId && item.date === batch.date),
    );
    queue.push(batch);
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Local storage mavjud bo'lmasa — jim o'tkazib yuboriladi.
  }
}

function readQueue(): QueuedBatch[] {
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedBatch[]) : [];
  } catch {
    return [];
  }
}

/** Navbatdagi davomatni serverga yuboradi (Local Queue → Server Sync). */
async function flushQueue(): Promise<void> {
  const queue = readQueue();
  if (queue.length === 0 || !navigator.onLine) return;

  const remaining: QueuedBatch[] = [];
  for (const batch of queue) {
    const result = await markAttendanceAction(batch);
    if (!result.ok) remaining.push(batch);
  }
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  } catch {
    // e'tiborsiz
  }
}
