import { collection, addDoc, onSnapshot, query, orderBy, limitToLast, serverTimestamp } from '../core/sdk.js';
import { BaseRepository } from './base-repository.js';

/** Mesajele unui cuplu: messages/{coupleId}/msgs. */
export class MessageRepository extends BaseRepository {
  #col(coupleId) {
    return collection(this.db, 'messages', coupleId, 'msgs');
  }

  watchLatest(coupleId, count, callback) {
    const q = query(this.#col(coupleId), orderBy('createdAt', 'asc'), limitToLast(count));
    return onSnapshot(q, (s) => callback(BaseRepository.toList(s)), BaseRepository.logError('messages'));
  }

  send(coupleId, data) {
    return addDoc(this.#col(coupleId), { ...data, createdAt: serverTimestamp() });
  }
}
