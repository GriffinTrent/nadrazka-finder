import type { Nadrazka } from './types';

let cached: Nadrazka[] | null = null;

export async function getNadrazky(): Promise<Nadrazka[]> {
  if (cached) return cached;
  const res = await fetch('/data/nadrazky.json');
  if (!res.ok) return [];
  const data = await res.json();
  cached = Array.isArray(data) ? data : [];
  return cached;
}
