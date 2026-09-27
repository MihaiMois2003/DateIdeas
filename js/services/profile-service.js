import { DomainError } from '../core/errors.js';

export const USERNAME_PATTERN = /^[a-z0-9._]{3,20}$/;

export function normalizeUsername(raw) {
  return String(raw || '').trim().replace(/^@/, '').toLowerCase();
}

export class ProfileService {
  #users;

  constructor({ userRepository }) {
    this.#users = userRepository;
  }

  get(uid) {
    return this.#users.get(uid);
  }

  validate(raw) {
    const username = normalizeUsername(raw);
    if (!USERNAME_PATTERN.test(username)) {
      throw new DomainError('Folosește 3–20 caractere: litere mici, cifre, punct sau underscore.');
    }
    return username;
  }

  async claimUsername(authUser, raw) {
    const username = this.validate(raw);
    await this.#users.createWithUsername(authUser.uid, username, {
      displayName: authUser.displayName,
      photoURL: authUser.photoURL,
    });
    return this.#users.get(authUser.uid);
  }
}
