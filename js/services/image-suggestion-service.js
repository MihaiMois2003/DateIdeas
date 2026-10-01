import { httpsCallable } from '../core/sdk.js';

const CALL_TIMEOUT_MS = 15000;

/**
 * Sugestii de poze pentru idei (Google Places + Pixabay), prin Cloud Functions.
 * Cheile API stau doar pe server; aici rămân apelurile și un cache pentru pozele locurilor.
 */
export class ImageSuggestionService {
  #search;
  #import;
  #resolve;
  #location;
  /** placeId → Promise<string|null>; URL-urile Places sunt temporare, deci le ținem doar în sesiune. */
  #placePhotos = new Map();
  #placeUrls = new Map();

  constructor({ functions, locationService }) {
    const call = (name) => httpsCallable(functions, name, { timeout: CALL_TIMEOUT_MS });
    this.#search = call('searchImages');
    this.#import = call('importPixabayImage');
    this.#resolve = call('resolvePlacePhoto');
    this.#location = locationService;
  }

  /** Cel mult 9 sugestii: { id, source: 'places' | 'pixabay', thumbUrl, label, credit }. */
  async search(query) {
    const location = await this.#location.current();
    const { data } = await this.#search({ query, ...location });
    const suggestions = data?.suggestions || [];
    suggestions.filter((s) => s.source === 'places').forEach((s) => this.#remember(s.id, s.thumbUrl));
    return suggestions;
  }

  /** Copiază poza Pixabay în Storage-ul cuplului; întoarce { url, path, credit }. */
  async importPixabay(imageId, coupleId) {
    const { data } = await this.#import({ imageId, coupleId });
    return data;
  }

  /** URL-ul pozei unui loc, dacă e deja rezolvat în sesiunea asta (fără așteptare). */
  cachedPlacePhoto(placeId) {
    return this.#placeUrls.get(placeId) ?? null;
  }

  /** URL proaspăt pentru poza unui loc; null dacă nu se poate (rămâne fundalul cu model). */
  placePhoto(placeId) {
    if (!placeId) return Promise.resolve(null);
    if (!this.#placePhotos.has(placeId)) {
      this.#placePhotos.set(
        placeId,
        this.#resolve({ placeId })
          .then(({ data }) => this.#remember(placeId, data?.url))
          .catch((error) => {
            console.warn('[images] resolvePlacePhoto', error);
            return null;
          }),
      );
    }
    return this.#placePhotos.get(placeId);
  }

  #remember(placeId, url) {
    if (!url) return null;
    this.#placeUrls.set(placeId, url);
    this.#placePhotos.set(placeId, Promise.resolve(url));
    return url;
  }
}
