/** `?hero=1` is a chrome-free establishing shot for the README. */
export function isHeroShot() {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('hero') === '1'
}
