import {
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut,
} from '../core/sdk.js';

/** Autentificare doar cu Google. Pe iPhone încearcă popup, apoi redirect dacă popup-ul e blocat. */
export class AuthService {
  #auth;
  #provider = new GoogleAuthProvider();

  constructor(auth) {
    this.#auth = auth;
    this.#provider.setCustomParameters({ prompt: 'select_account' });
    getRedirectResult(this.#auth).catch((error) => console.warn('[auth] redirect', error));
  }

  onChange(callback) {
    return onAuthStateChanged(this.#auth, callback);
  }

  async signIn() {
    try {
      await signInWithPopup(this.#auth, this.#provider);
    } catch (error) {
      const fallback = ['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'];
      if (fallback.includes(error.code)) return signInWithRedirect(this.#auth, this.#provider);
      throw error;
    }
  }

  signOut() {
    return signOut(this.#auth);
  }
}
