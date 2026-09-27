import { initializeApp, getAuth, getFirestore, getStorage } from './sdk.js';

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
  };
}
