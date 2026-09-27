/**
 * Notificări în aplicație pentru activitatea partenerului.
 * Primul snapshot al fiecărui flux e doar „linia de bază” — nu anunțăm ce exista deja.
 */
export class NotificationService {
  #bus;
  #toaster;
  #session;
  #seenIdeas = null;
  #seenMessages = null;
  #seenRequests = null;
  #chatOpen = false;

  constructor({ bus, toaster, session }) {
    this.#bus = bus;
    this.#toaster = toaster;
    this.#session = session;
  }

  start() {
    this.#bus.on('ideas:changed', (ideas) => this.#onIdeas(ideas));
    this.#bus.on('messages:changed', (messages) => this.#onMessages(messages));
    this.#bus.on('requests:changed', ({ incoming }) => this.#onRequests(incoming));
    this.#bus.on('chat:toggled', (open) => (this.#chatOpen = open));
    this.#bus.on('hub:stopped', () => {
      this.#seenIdeas = null;
      this.#seenMessages = null;
    });
  }

  #onIdeas(ideas) {
    const partnerId = this.#session.partner?.uid;
    if (this.#seenIdeas) {
      ideas
        .filter((idea) => !this.#seenIdeas.has(idea.id) && idea.authorId === partnerId)
        .forEach((idea) => this.#toaster.show(`${this.#session.nameOf(partnerId)} a propus o idee: ${idea.title}`, { tone: 'rose' }));
    }
    this.#seenIdeas = new Set(ideas.map((idea) => idea.id));
  }

  #onMessages(messages) {
    const partnerId = this.#session.partner?.uid;
    if (this.#seenMessages && !this.#chatOpen) {
      const fresh = messages.filter((m) => !this.#seenMessages.has(m.id) && m.senderId === partnerId);
      const last = fresh.at(-1);
      if (last) {
        const preview = last.text.length > 70 ? `${last.text.slice(0, 70)}…` : last.text;
        this.#toaster.show(`${this.#session.nameOf(partnerId)}: ${preview}`, {
          tone: 'plain',
          action: { label: 'Răspunde', run: () => this.#bus.emit('chat:open') },
        });
      }
    }
    this.#seenMessages = new Set(messages.map((m) => m.id));
  }

  #onRequests(incoming) {
    if (this.#seenRequests) {
      incoming
        .filter((r) => !this.#seenRequests.has(r.id))
        .forEach((r) => this.#toaster.show(`@${r.fromUsername} ți-a trimis o cerere de partener`, { tone: 'rose' }));
    }
    this.#seenRequests = new Set(incoming.map((r) => r.id));
  }
}
