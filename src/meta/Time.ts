const DAY_MS = 86_400_000;

/** Local calendar day number (changes at local midnight). */
export function localDay(now: number): number {
  const offsetMs = new Date(now).getTimezoneOffset() * 60_000;
  return Math.floor((now - offsetMs) / DAY_MS);
}

/** Deterministic 32-bit seed from a day or bucket number. */
export function seedOf(n: number, salt = 0): number {
  return (Math.imul(n + 1, 0x9e3779b1) ^ Math.imul(salt + 7, 0x85ebca6b)) >>> 0;
}
