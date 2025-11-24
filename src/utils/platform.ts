/**
 * Platform detection utilities
 */

/**
 * Check if running on a native platform (iOS/Android via Capacitor)
 */
export const isNative = (): boolean => {
  try {
    const win = window as any
    return !!(win.CapacitorCustomPlatform || win.cordova || win.capacitor)
  } catch {
    return false
  }
}

/**
 * Check if running on web platform
 */
export const isWeb = (): boolean => {
  return !isNative()
}
