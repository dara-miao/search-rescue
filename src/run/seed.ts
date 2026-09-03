/** `?seed=42` pins ignition and victim placement. Invalid values are ignored. */
export function parseSeed(search: string): number | null {
  const q = search.startsWith('?') ? search : `?${search}`
  const raw = new URLSearchParams(q).get('seed')
  if (raw == null || raw.trim() === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  return n >>> 0
}

export function seedQuery(seed: number) {
  return `?seed=${seed >>> 0}`
}
