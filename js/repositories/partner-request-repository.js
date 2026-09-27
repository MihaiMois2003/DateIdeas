import {
  collection, query, where, onSnapshot, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from '../core/sdk.js';
import { BaseRepository } from './base-repository.js';

export class PartnerRequestRepository extends BaseRepository {
  get #col() {
    return collection(this.db, 'partnerRequests');
  }

  #byField(field, uid) {
    return query(this.#col, where(field, '==', uid));
  }

  async listOutgoing(uid) {
    return BaseRepository.toList(await getDocs(this.#byField('fromUserId', uid)));
  }

  async listIncoming(uid) {
    return BaseRepository.toList(await getDocs(this.#byField('toUserId', uid)));
  }

  watchOutgoing(uid, callback) {
    return onSnapshot(this.#byField('fromUserId', uid), (s) => callback(BaseRepository.toList(s)), BaseRepository.logError('requests:out'));
  }

  watchIncoming(uid, callback) {
    return onSnapshot(this.#byField('toUserId', uid), (s) => callback(BaseRepository.toList(s)), BaseRepository.logError('requests:in'));
  }

  create(data) {
    return addDoc(this.#col, { ...data, status: 'pending', createdAt: serverTimestamp() });
  }

  update(id, patch) {
    return updateDoc(doc(this.db, 'partnerRequests', id), patch);
  }

  remove(id) {
    return deleteDoc(doc(this.db, 'partnerRequests', id));
  }
}
