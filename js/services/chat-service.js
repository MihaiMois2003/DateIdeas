import { DomainError } from '../core/errors.js';

export class ChatService {
  #messages;

  constructor({ messageRepository }) {
    this.#messages = messageRepository;
  }

  send(context, text) {
    const clean = String(text || '').trim();
    if (!clean) return null;
    if (clean.length > 2000) throw new DomainError('Mesajul e prea lung (maximum 2000 de caractere).');
    return this.#messages.send(context.coupleId, { senderId: context.uid, text: clean });
  }
}

/** Ține minte, pe dispozitiv, până unde ai citit conversația. */
export class ReadMarker {
  #key;

  constructor(coupleId, uid) {
    this.#key = `dateideas:read:${coupleId}:${uid}`;
  }

  get lastRead() {
    try {
      return Number(localStorage.getItem(this.#key)) || 0;
    } catch {
      return 0;
    }
  }

  markRead(timestamp = Date.now()) {
    try {
      localStorage.setItem(this.#key, String(timestamp));
    } catch {
      /* stocarea poate lipsi în modul privat */
    }
  }

  unreadCount(messages, myUid) {
    const since = this.lastRead;
    return messages.filter((m) => m.senderId !== myUid && toMillis(m.createdAt) > since).length;
  }
}

export function toMillis(timestamp) {
  if (!timestamp) return Date.now();
  if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
  return new Date(timestamp).getTime();
}
