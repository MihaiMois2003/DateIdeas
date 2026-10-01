import { fetchJson, fetchBuffer, ExternalError } from './http.js';

const API = 'https://pixabay.com/api/';
const SOURCE = 'pixabay';

/** Pixabay: poze generale (picnic, patinaj, cină la lumânări). */
export class PixabayClient {
  #apiKey;

  constructor(apiKey) {
    this.#apiKey = apiKey;
  }

  async search(query, { limit = 6 } = {}) {
    const data = await fetchJson(SOURCE, this.#url({ q: query, per_page: String(limit) }));
    return (data.hits || []).slice(0, limit).map((hit) => ({
      id: String(hit.id),
      source: SOURCE,
      thumbUrl: hit.webformatURL,
      label: PixabayClient.#label(hit.tags) || query,
      credit: PixabayClient.#credit(hit),
    }));
  }

  /** Reia imaginea după id (URL-urile Pixabay expiră) și o descarcă la rezoluție mare. */
  async download(imageId) {
    const data = await fetchJson(SOURCE, this.#url({ id: imageId }));
    const hit = data.hits?.[0];
    if (!hit?.largeImageURL) return null;
    const { buffer, contentType } = await fetchBuffer(SOURCE, hit.largeImageURL);
    if (!contentType.startsWith('image/')) throw new ExternalError(SOURCE, `tip neașteptat: ${contentType}`);
    return { buffer, contentType, credit: PixabayClient.#credit(hit) };
  }

  #url(params) {
    const search = new URLSearchParams({
      key: this.#apiKey,
      lang: 'ro',
      image_type: 'photo',
      safesearch: 'true',
      ...params,
    });
    return `${API}?${search}`;
  }

  static #label(tags = '') {
    const first = String(tags).split(',')[0].trim();
    return first ? first.charAt(0).toUpperCase() + first.slice(1) : '';
  }

  static #credit(hit) {
    return { name: hit.user || 'Pixabay', url: hit.pageURL || 'https://pixabay.com' };
  }
}
