/**
 * Cache mic în memoria instanței, cu expirare.
 * Protejează cotele API la căutări identice repetate (ex. titlul tastat de amândoi).
 */
export class TtlCache {
  #entries = new Map();
  #ttlMs;
  #maxEntries;

  constructor({ ttlMs, maxEntries = 300 }) {
    this.#ttlMs = ttlMs;
    this.#maxEntries = maxEntries;
  }

  get(key) {
    const entry = this.#entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.#entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value) {
    if (this.#entries.size >= this.#maxEntries) {
      // Map păstrează ordinea inserării: prima cheie e cea mai veche.
      this.#entries.delete(this.#entries.keys().next().value);
    }
    this.#entries.set(key, { value, expiresAt: Date.now() + this.#ttlMs });
    return value;
  }
}
