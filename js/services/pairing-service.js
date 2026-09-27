import { DomainError } from '../core/errors.js';
import { normalizeUsername, USERNAME_PATTERN } from './profile-service.js';

/**
 * Regulile împerecherii:
 * - cauți după username exact
 * - o singură cerere trimisă în așteptare la un moment dat
 * - cuplul e permanent odată format
 */
export class PairingService {
  #users;
  #requests;
  #couples;

  constructor({ userRepository, partnerRequestRepository, coupleRepository }) {
    this.#users = userRepository;
    this.#requests = partnerRequestRepository;
    this.#couples = coupleRepository;
  }

  async search(raw) {
    const username = normalizeUsername(raw);
    if (!USERNAME_PATTERN.test(username)) return null;
    return this.#users.findByUsername(username);
  }

  async sendRequest(me, target) {
    if (target.uid === me.uid) throw new DomainError('Asta ești tu. Caută username-ul persoanei tale.');
    if (target.coupleId) throw new DomainError(`@${target.username} are deja un partener pe DateIdeas.`);

    const outgoing = await this.#requests.listOutgoing(me.uid);
    if (outgoing.some((r) => r.status === 'pending')) {
      throw new DomainError('Ai deja o cerere în așteptare. Anuleaz-o ca să trimiți alta.');
    }

    // Dacă persoana ți-a trimis deja o cerere, o acceptăm direct.
    const incoming = await this.#requests.listIncoming(me.uid);
    const reverse = incoming.find((r) => r.status === 'pending' && r.fromUserId === target.uid);
    if (reverse) return this.accept(reverse, me);

    await this.#requests.create({
      fromUserId: me.uid,
      fromUsername: me.username,
      fromName: me.displayName || me.username,
      fromPhoto: me.photoURL || '',
      toUserId: target.uid,
      toUsername: target.username,
      toName: target.displayName || target.username,
      toPhoto: target.photoURL || '',
    });
    return null;
  }

  async accept(request, me) {
    const sender = await this.#users.get(request.fromUserId);
    if (!sender || sender.coupleId) {
      await this.#requests.update(request.id, { status: 'declined' });
      throw new DomainError(`@${request.fromUsername} și-a găsit deja partenerul între timp.`);
    }
    // Ordinea contează pentru regulile de securitate: cuplul se creează cât cererea e încă „pending”.
    const couple = await this.#couples.create(request.fromUserId, me.uid, request.id);
    await this.#requests.update(request.id, { status: 'accepted', coupleId: couple.id });
    await this.#users.update(me.uid, { coupleId: couple.id });
    await this.#declineOthers(me.uid, request.id);
    return couple;
  }

  decline(request) {
    return this.#requests.update(request.id, { status: 'declined' });
  }

  cancel(request) {
    return this.#requests.remove(request.id);
  }

  /** Găsește cuplul utilizatorului și sincronizează coupleId pe profil. */
  async resolveCouple(profile) {
    const couple = await this.#couples.findByMember(profile.uid);
    if (couple && profile.coupleId !== couple.id) {
      await this.#users.update(profile.uid, { coupleId: couple.id });
    }
    return couple;
  }

  async #declineOthers(uid, acceptedId) {
    const incoming = await this.#requests.listIncoming(uid);
    await Promise.all(
      incoming
        .filter((r) => r.id !== acceptedId && r.status === 'pending')
        .map((r) => this.#requests.update(r.id, { status: 'declined' })),
    );
  }
}
