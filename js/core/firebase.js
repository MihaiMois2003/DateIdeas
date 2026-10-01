import { initializeApp, getAuth, getFirestore, getStorage, getFunctions } from './sdk.js';

/** Regiunea în care rulează Cloud Functions (aceeași ca în functions/index.js). */
const FUNCTIONS_REGION = 'europe-west1';

/**
 * Creează instanțele Firebase o singură dată.
 * Restul aplicației le primește prin injecție de dependențe, nu le importă global.
 */
export function createFirebase(config) {
  const app = initializeApp(config);
  return {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    storage: getStorage(app),
    functions: getFunctions(app, FUNCTIONS_REGION),
  };
}
