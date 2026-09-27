import {
  collection, doc, addDoc, deleteDoc, getDocs, onSnapshot, query, orderBy, serverTimestamp,
} from '../core/sdk.js';
import { BaseRepository } from './base-repository.js';

/** Amintirile unui date: subcolecția ideas/{ideaId}/entries. */
export class EntryRepository extends BaseRepository {
  #col(ideaId) {
    return collection(this.db, 'ideas', ideaId, 'entries');
  }

  #ordered(ideaId) {
    return query(this.#col(ideaId), orderBy('createdAt', 'asc'));
  }

  watchForIdea(ideaId, callback) {
    return onSnapshot(this.#ordered(ideaId), (s) => callback(BaseRepository.toList(s)), BaseRepository.logError('entries'));
  }

  async list(ideaId) {
    return BaseRepository.toList(await getDocs(this.#ordered(ideaId)));
  }

  create(ideaId, data) {
    return addDoc(this.#col(ideaId), { ...data, createdAt: serverTimestamp() });
  }

  remove(ideaId, entryId) {
    return deleteDoc(doc(this.db, 'ideas', ideaId, 'entries', entryId));
  }
}
