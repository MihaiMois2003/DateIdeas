import {
  collection, doc, getDocs, setDoc, updateDoc, onSnapshot, query, where, limit, serverTimestamp,
} from '../core/sdk.js';
import { BaseRepository } from './base-repository.js';

export class CoupleRepository extends BaseRepository {
  /** Id determinist: aceeași pereche produce mereu același document (fără duplicate). */
  static idFor(a, b) {
    return [a, b].sort().join('_');
  }

  async findByMember(uid) {
    const q = query(collection(this.db, 'couples'), where('members', 'array-contains', uid), limit(1));
    const [first] = BaseRepository.toList(await getDocs(q));
    return first ?? null;
  }

  async create(a, b, requestId) {
    const id = CoupleRepository.idFor(a, b);
    await setDoc(doc(this.db, 'couples', id), {
      members: [a, b].sort(),
      requestId,
      anniversary: null,
      createdAt: serverTimestamp(),
    });
    return { id, members: [a, b].sort() };
  }

  watch(id, callback) {
    return onSnapshot(doc(this.db, 'couples', id), (s) => callback(BaseRepository.toModel(s)), BaseRepository.logError('couple'));
  }

  setAnniversary(id, isoDate) {
    return updateDoc(doc(this.db, 'couples', id), { anniversary: isoDate || null });
  }
}
