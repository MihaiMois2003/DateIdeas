/**
 * Orchestrare: când se schimbă utilizatorul logat, încarcă profilul, cuplul și partenerul,
 * pornește hub-ul de date și urmărește cererile de partener cât timp nu există un cuplu.
 */
export class SessionController {
  #deps;
  #watchers = [];

  requests = { incoming: [], outgoing: [] };

  constructor(deps) {
    this.#deps = deps; // { authService, profileService, pairingService, userRepository, coupleRepository, partnerRequestRepository, hub, session, bus }
  }

  start() {
    this.#deps.authService.onChange((authUser) => this.#load(authUser));
  }

  refresh() {
    return this.#load(this.#deps.session.state.authUser);
  }

  async #load(authUser) {
    const { session, hub, profileService, pairingService, userRepository } = this.#deps;
    this.#stopWatchers();

    if (!authUser) {
      hub.stop();
      session.set({ ready: true, authUser: null, profile: null, couple: null, partner: null });
      return;
    }

    try {
      const profile = await profileService.get(authUser.uid);
      let couple = null;
      let partner = null;

      if (profile?.username) {
        couple = await pairingService.resolveCouple(profile);
        if (couple) {
          partner = await userRepository.get(couple.members.find((m) => m !== authUser.uid));
          hub.start({ uid: authUser.uid, coupleId: couple.id });
          this.#watchCouple(couple.id);
        } else {
          hub.stop();
          this.#watchRequests(authUser.uid);
        }
      }

      session.set({ ready: true, authUser, profile, couple, partner });
    } catch (error) {
      console.error('[session]', error);
      session.set({ ready: true, authUser, profile: null, couple: null, partner: null });
      this.#deps.bus.emit('session:error', error);
    }
  }

  #watchCouple(coupleId) {
    const { coupleRepository, session } = this.#deps;
    this.#watchers.push(
      coupleRepository.watch(coupleId, (couple) => couple && session.set({ couple })),
    );
  }

  #watchRequests(uid) {
    const { partnerRequestRepository, bus } = this.#deps;
    this.requests = { incoming: [], outgoing: [] };
    this.#watchers.push(
      partnerRequestRepository.watchIncoming(uid, (list) => {
        this.requests.incoming = list.filter((r) => r.status === 'pending');
        bus.emit('requests:changed', this.requests);
      }),
      partnerRequestRepository.watchOutgoing(uid, (list) => {
        this.requests.outgoing = list.filter((r) => r.status === 'pending');
        bus.emit('requests:changed', this.requests);
        // Partenerul ne-a acceptat cererea: reîncărcăm sesiunea ca să intrăm în spațiul comun.
        if (list.some((r) => r.status === 'accepted')) this.refresh();
      }),
    );
  }

  #stopWatchers() {
    this.#watchers.splice(0).forEach((unsubscribe) => unsubscribe());
  }
}
