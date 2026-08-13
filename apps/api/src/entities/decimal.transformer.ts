/* Postgres `decimal` / `numeric` arrives as string; convert to JS number for the app. */

import type { ValueTransformer } from 'typeorm';

export const columnNumericTransformer: ValueTransformer = {
  to(value?: number | null): number | null {
    if (value === null || value === undefined) return null;
    return value;
  },
  from(value?: string | number | null): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  },
};

/** @deprecated use columnNumericTransformer */
export const ColumnNumericTransformer = columnNumericTransformer;
