/** Internal helpers for keeping NaN and ±Infinity out of results. */

/** The value when it is a finite number, otherwise null. */
export const finiteOrNull = (value: number): number | null =>
  Number.isFinite(value) ? value : null;

/** True when every entry is a finite number (no undefined, null, NaN or ±Infinity). */
export const allFinite = (values: readonly unknown[]): values is number[] =>
  values.every((v) => typeof v === "number" && Number.isFinite(v));
