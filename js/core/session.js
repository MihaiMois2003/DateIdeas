/**
 * Starea globală a sesiunii. Doar SessionController o modifică;
 * restul aplicației o citește și ascultă evenimentul „session:changed”.
 */
export const Phase = Object.freeze({
  LOADING: 'loading',
  ANON: 'anon',
  ONBOARDING: 'onboarding',
  PAIRING: 'pairing',
  PAIRED: 'paired',
});

export class Session {
  #state = { ready: false, authUser: null, profile: null, couple: null, partner: null };

  constructor(bus) {
    this.bus = bus;
  }

  get state() {
    return this.#state;
  }

  set(patch) {
    const previousPhase = this.phase;
    this.#state = { ...this.#state, ...patch };
    this.bus.emit('session:changed', { state: this.#state, phaseChanged: previousPhase !== this.phase });
  }

  get phase() {
    const { ready, authUser, profile, couple } = this.#state;
    if (!ready) return Phase.LOADING;
    if (!authUser) return Phase.ANON;
    if (!profile?.username) return Phase.ONBOARDING;
    if (!couple) return Phase.PAIRING;
    return Phase.PAIRED;
  }

  get uid() {
    return this.#state.authUser?.uid ?? null;
  }

  get me() {
    return this.#state.profile;
  }

  get partner() {
    return this.#state.partner;
  }

  get couple() {
    return this.#state.couple;
  }

  get coupleId() {
    return this.#state.couple?.id ?? null;
  }

  /** Contextul de care au nevoie serviciile pentru a scrie date ale cuplului. */
  get coupleContext() {
    const couple = this.#state.couple;
    return couple ? { uid: this.uid, coupleId: couple.id, members: couple.members } : null;
  }

  personOf(uid) {
    if (uid === this.uid) return this.me;
    if (uid === this.partner?.uid) return this.partner;
    return null;
  }

  nameOf(uid) {
    return firstName(this.personOf(uid));
  }
}

export function firstName(person) {
  if (!person) return 'Cineva';
  const name = (person.displayName || '').trim().split(/\s+/)[0];
  return name || person.username || 'Cineva';
}
