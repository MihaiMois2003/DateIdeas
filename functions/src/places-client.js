import { fetchJson } from './http.js';

const API = 'https://places.googleapis.com/v1';
const SOURCE = 'places';
const BIAS_RADIUS_M = 30000;

/**
 * Google Places API (New): locuri concrete și prima lor poză.
 * Pozele Places nu se stochează (termenii Google Maps Platform); doar photoUri temporar.
 */
export class PlacesClient {
  #apiKey;

  constructor(apiKey) {
    this.#apiKey = apiKey;
  }

  /** Caută locuri și le întoarce ca sugestii normalizate (cele fără poză sunt sărite). */
  async search(query, { lat, lng, limit = 4 } = {}) {
    const body = { textQuery: query, languageCode: 'ro', regionCode: 'RO', pageSize: limit };
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: BIAS_RADIUS_M } };
    }

    const data = await fetchJson(SOURCE, `${API}/places:searchText`, {
      method: 'POST',
      headers: {
        'X-Goog-Api-Key': this.#apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.photos',
      },
      body,
    });

    const places = (data.places || []).filter((place) => place.id && place.photos?.length);
    const settled = await Promise.allSettled(places.map((place) => this.#toSuggestion(place)));
    return settled.filter((r) => r.status === 'fulfilled' && r.value).map((r) => r.value);
  }

  /** Un photoUri proaspăt pentru prima poză a unui loc deja ales. */
  async firstPhoto(placeId) {
    const place = await fetchJson(SOURCE, `${API}/places/${encodeURIComponent(placeId)}`, {
      headers: { 'X-Goog-Api-Key': this.#apiKey, 'X-Goog-FieldMask': 'id,photos' },
    });
    const photo = place.photos?.[0];
    if (!photo) return null;
    return { url: await this.#photoUri(photo.name), credit: PlacesClient.#credit(photo) };
  }

  async #toSuggestion(place) {
    const photo = place.photos[0];
    return {
      id: place.id,
      source: SOURCE,
      thumbUrl: await this.#photoUri(photo.name),
      label: place.displayName?.text || place.formattedAddress || '',
      credit: PlacesClient.#credit(photo),
    };
  }

  /** Cu skipHttpRedirect primim un JSON cu photoUri, deci cheia nu ajunge niciodată în URL-ul pozei. */
  async #photoUri(photoName) {
    const url = `${API}/${photoName}/media?maxWidthPx=800&skipHttpRedirect=true`;
    const data = await fetchJson(SOURCE, url, { headers: { 'X-Goog-Api-Key': this.#apiKey } });
    if (!data.photoUri) throw new Error('photoUri lipsă');
    return data.photoUri;
  }

  static #credit(photo) {
    const author = photo.authorAttributions?.[0];
    return { name: author?.displayName || 'Google Maps', url: author?.uri || 'https://maps.google.com' };
  }
}
