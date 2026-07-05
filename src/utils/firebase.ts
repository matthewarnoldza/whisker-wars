// Firebase is lazy-loaded so the whole SDK stays out of the main bundle.
//
// Nothing here runs at module load: initializeApp/getDatabase are only invoked
// on the first getDb() call, and the SDK itself is pulled in via dynamic
// import() so Rollup splits it into its own vendor-firebase chunk. Cloud
// features (cloud save, leaderboards, payment verification) never run on first
// paint, so this cost is deferred until a consumer actually needs it.

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
}

// The database instance plus the database functions consumers use. Returning
// the functions through here (rather than a static `import 'firebase/database'`
// anywhere) is what keeps the SDK fully out of the main chunk.
export interface FirebaseDb {
  database: import('firebase/database').Database
  ref: typeof import('firebase/database').ref
  set: typeof import('firebase/database').set
  get: typeof import('firebase/database').get
  query: typeof import('firebase/database').query
  orderByChild: typeof import('firebase/database').orderByChild
  limitToLast: typeof import('firebase/database').limitToLast
}

// Memoized: the dynamic imports + initialization happen at most once. Every
// caller awaits the same promise, so concurrent first calls don't double-init.
let dbPromise: Promise<FirebaseDb> | null = null

export function getDb(): Promise<FirebaseDb> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const [{ initializeApp }, dbMod] = await Promise.all([
        import('firebase/app'),
        import('firebase/database'),
      ])
      const app = initializeApp(firebaseConfig)
      const database = dbMod.getDatabase(app)
      return {
        database,
        ref: dbMod.ref,
        set: dbMod.set,
        get: dbMod.get,
        query: dbMod.query,
        orderByChild: dbMod.orderByChild,
        limitToLast: dbMod.limitToLast,
      }
    })()
  }
  return dbPromise
}
