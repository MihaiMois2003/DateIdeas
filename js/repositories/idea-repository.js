import {
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, where,
  arrayUnion, arrayRemove, serverTimestamp, Timestamp,
} from '../core/sdk.js';
import { BaseRepository } from './base-repository.js';

export class IdeaRepository extends BaseRepository {
  #ref(id) {
    return doc(this.db, 'ideas', id);
  }

  /** Interogarea pe „members” e cea permisă de regulile de securitate. */
  watchForMember(uid, callback) {
    const q = query(collection(this.db, 'ideas'), where('members', 'array-contains', uid));
    return onSnapshot(q, (s) => callback(BaseRepository.toList(s)), BaseRepository.logError('ideas'));
  }

  create(data) {
    return addDoc(collection(this.db, 'ideas'), {
      ...data,
      likes: [],
      status: 'idea',
      doneDate: null,
      createdAt: serverTimestamp(),
    });
  }

  setLiked(id, uid, liked) {
    return updateDoc(this.#ref(id), { likes: liked ? arrayUnion(uid) : arrayRemove(uid) });
  }

  markDone(id, date) {
    return updateDoc(this.#ref(id), { status: 'done', doneDate: Timestamp.fromDate(date) });
  }

  reopen(id) {
    return updateDoc(this.#ref(id), { status: 'idea', doneDate: null });
  }

  remove(id) {
    return deleteDoc(this.#ref(id));
  }
}
