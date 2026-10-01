const DECLINED_KEY = 'dateideas.location';

/**
 * Locația aproximativă a telefonului, pentru sugestii din apropiere.
 * Cere permisiunea cel mult o dată; dacă e refuzată, ține minte și nu mai întreabă.
 */
export class LocationService {
  #geolocation;
  #storage;
  #request = null;

  constructor({ geolocation = navigator.geolocation, storage = LocationService.#safeStorage() } = {}) {
    this.#geolocation = geolocation;
    this.#storage = storage;
  }

  /** { lat, lng } rotunjite la ~1 km, sau {} dacă nu avem locația în `waitMs`. */
  async current({ waitMs = 6000 } = {}) {
    if (!this.#geolocation || this.#declined) return {};
    this.#request ??= this.#ask();
    const timeout = new Promise((resolve) => setTimeout(() => resolve({}), waitMs));
    return Promise.race([this.#request, timeout]);
  }

  #ask() {
    return new Promise((resolve) => {
      this.#geolocation.getCurrentPosition(
        ({ coords }) => resolve({ lat: round(coords.latitude), lng: round(coords.longitude) }),
        (error) => {
          if (error.code === error.PERMISSION_DENIED) this.#declined = true;
          resolve({});
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 30 * 60 * 1000 },
      );
    });
  }

  get #declined() {
    try {
      return this.#storage?.getItem(DECLINED_KEY) === 'declined';
    } catch {
      return false;
    }
  }

  set #declined(value) {
    try {
      if (value) this.#storage?.setItem(DECLINED_KEY, 'declined');
    } catch {
      // Fără storage (navigare privată): browserul oricum ține minte refuzul.
    }
  }

  static #safeStorage() {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }
}

function round(value) {
  return Math.round(value * 100) / 100;
}
