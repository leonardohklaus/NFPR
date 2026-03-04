/**
 * Encodes a numeric ID to a base64 string for use in URLs,
 * preventing trivial enumeration by curious users.
 */
export const encodeId = (id) => btoa(`nf:${id}`)

/**
 * Decodes a base64-encoded ID back to a numeric ID.
 * Returns null if the value is invalid.
 */
export const decodeId = (encoded) => {
  try {
    const decoded = atob(encoded)
    if (!decoded.startsWith('nf:')) return null
    const num = parseInt(decoded.slice(3), 10)
    return Number.isFinite(num) ? num : null
  } catch {
    return null
  }
}
