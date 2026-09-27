import { doc, getDoc, updateDoc, runTransaction, serverTimestamp } from '../core/sdk.js';
import { BaseRepository } from './base-repository.js';
import { DomainError } from '../core/errors.js';

export class UserRepository extends BaseRepository {
  #userRef(uid) {
    return doc(this.db, 'users', uid);
  }

  #nameRef(username) {
    return doc(this.db, 'usernames', username);
  }

  async get(uid) {
    return BaseRepository.toModel(await getDoc(this.#userRef(uid)));
  }

  update(uid, patch) {
    return updateDoc(this.#userRef(uid), patch);
  }

  async findByUsername(username) {
    const claim = await getDoc(this.#nameRef(username));
    if (!claim.exists()) return null;
    return this.get(claim.data().uid);
  }

  /** Rezervă username-ul și creează profilul atomic (username-urile rămân unice). */
  createWithUsername(uid, username, { displayName, photoURL }) {
    return runTransaction(this.db, async (tx) => {
      const nameRef = this.#nameRef(username);
      const claim = await tx.get(nameRef);
      if (claim.exists() && claim.data().uid !== uid) {
        throw new DomainError(`@${username} e deja luat. Încearcă altă variantă.`);
      }
      if (!claim.exists()) tx.set(nameRef, { uid });
      tx.set(
        this.#userRef(uid),
        {
          uid,
          username,
          displayName: displayName || username,
          photoURL: photoURL || '',
          coupleId: null,
          createdAt: serverTimestamp(),
        },
        { merge: true },
      );
    });
  }
}
