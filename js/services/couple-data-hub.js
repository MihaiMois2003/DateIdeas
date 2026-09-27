/**
 * Un singur abonament real-time la ideile și mesajele cuplului.
 * Ecranele citesc de aici și ascultă evenimente, în loc să deschidă fiecare propria conexiune.
 */
export class CoupleDataHub {
  #ideasRepo;
  #messagesRepo;
  #bus;
  #unsubscribers = [];

  ideas = [];
  messages = [];
  loaded = { ideas: false, messages: false };

  constructor({ ideaRepository, messageRepository, bus }) {
    this.#ideasRepo = ideaRepository;
    this.#messagesRepo = messageRepository;
    this.#bus = bus;
  }

  start({ uid, coupleId }) {
    this.stop();
    this.#unsubscribers.push(
      this.#ideasRepo.watchForMember(uid, (ideas) => {
        this.ideas = ideas;
        this.loaded.ideas = true;
        this.#bus.emit('ideas:changed', ideas);
      }),
      this.#messagesRepo.watchLatest(coupleId, 300, (messages) => {
        this.messages = messages;
        this.loaded.messages = true;
        this.#bus.emit('messages:changed', messages);
      }),
    );
  }

  stop() {
    this.#unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
    this.ideas = [];
    this.messages = [];
    this.loaded = { ideas: false, messages: false };
    this.#bus.emit('hub:stopped');
  }

  idea(id) {
    return this.ideas.find((idea) => idea.id === id) ?? null;
  }
}
