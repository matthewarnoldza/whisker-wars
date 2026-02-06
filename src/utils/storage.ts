// Storage health detection for restricted browser environments
// (school Chromebooks, kiosk mode, private browsing, etc.)

export interface StorageHealth {
  localStorage: boolean
  sessionStorage: boolean
  healthy: boolean // true if at least localStorage works
}

const TEST_KEY = '__whisker_storage_test__'

// Test if localStorage is available and working
function testLocalStorage(): boolean {
  try {
    const testValue = Date.now().toString()
    localStorage.setItem(TEST_KEY, testValue)
    const retrieved = localStorage.getItem(TEST_KEY)
    localStorage.removeItem(TEST_KEY)
    return retrieved === testValue
  } catch {
    return false
  }
}

// Test if sessionStorage is available and working
function testSessionStorage(): boolean {
  try {
    const testValue = Date.now().toString()
    sessionStorage.setItem(TEST_KEY, testValue)
    const retrieved = sessionStorage.getItem(TEST_KEY)
    sessionStorage.removeItem(TEST_KEY)
    return retrieved === testValue
  } catch {
    return false
  }
}

// Check storage health - call this on app startup
export function checkStorageHealth(): StorageHealth {
  const localStorageWorks = testLocalStorage()
  const sessionStorageWorks = testSessionStorage()

  return {
    localStorage: localStorageWorks,
    sessionStorage: sessionStorageWorks,
    healthy: localStorageWorks
  }
}

// Singleton to cache the result (only check once per session)
let cachedHealth: StorageHealth | null = null

export function getStorageHealth(): StorageHealth {
  if (!cachedHealth) {
    cachedHealth = checkStorageHealth()
  }
  return cachedHealth
}

// Force re-check (useful after user grants permissions)
export function refreshStorageHealth(): StorageHealth {
  cachedHealth = checkStorageHealth()
  return cachedHealth
}
