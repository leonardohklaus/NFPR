/**
 * Client-side URL ID obfuscation.
 *
 * Uses XOR with a fixed 32-bit mask + base-36 encoding to produce
 * short, URL-safe strings that prevent casual sequential enumeration.
 *
 * NOTE: this is obfuscation, not encryption. Real authorization
 * is enforced on the backend via JWT + permission checks.
 */
const MASK = 0x4e9f2a7b   // arbitrary constant — change to invalidate old URLs

export function encodeId(id) {
  return ((id ^ MASK) >>> 0).toString(36)
}

export function decodeId(encoded) {
  if (!encoded) return null
  const n = parseInt(encoded, 36)
  if (isNaN(n)) return null
  return (n ^ MASK) >>> 0
}
