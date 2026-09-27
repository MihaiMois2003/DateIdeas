import { h, replace } from '../dom.js';
import { icon } from '../icons.js';
import { avatar } from './bits.js';
import { formatTime, formatLong, sameDay } from '../format.js';
import { ReadMarker, toMillis } from '../../services/chat-service.js';
import { toUserMessage } from '../../core/errors.js';

/** Bula de chat, vizibilă din orice ecran cât timp faceți parte dintr-un cuplu. */
export class ChatWidget {
  #ctx;
  #open = false;
  #marker = null;
  #list;
  #badge;
  #input;
  #panel;
  #title;

  constructor(ctx) {
    this.#ctx = ctx;
    this.#badge = h('span', { class: 'chat-bubble__badge', hidden: true });
    this.#list = h('ol', { class: 'chat__list', 'aria-live': 'polite' });
    this.#title = h('div', { class: 'chat__who' });
    this.#input = h('textarea', {
      class: 'chat__input',
      rows: 1,
      placeholder: 'Scrie un mesaj…',
      'aria-label': 'Mesaj',
      maxlength: 2000,
      oninput: () => this.#autoGrow(),
      onkeydown: (event) => {
        if (event.key === 'Enter' && !event.shiftKey && !matchMedia('(pointer: coarse)').matches) {
          event.preventDefault();
          this.#send();
        }
      },
    });

    this.#panel = h(
      'section',
      { class: 'chat', 'aria-label': 'Conversația voastră', hidden: true },
      h(
        'header',
        { class: 'chat__header' },
        this.#title,
        h('button', { class: 'icon-button', type: 'button', 'aria-label': 'Închide conversația', onclick: () => this.toggle(false) }, icon('close')),
      ),
      this.#list,
      h(
        'form',
        { class: 'chat__composer', onsubmit: (event) => (event.preventDefault(), this.#send()) },
        this.#input,
        h('button', { class: 'chat__send', type: 'submit', 'aria-label': 'Trimite' }, icon('send')),
      ),
    );

    this.bubble = h(
      'button',
      { class: 'chat-bubble', type: 'button', 'aria-label': 'Deschide conversația', onclick: () => this.toggle() },
      icon('chat', { size: 26 }),
      this.#badge,
    );

    this.el = h('div', { class: 'chat-root' }, this.#panel, this.bubble);

    ctx.bus.on('messages:changed', () => this.#render());
    ctx.bus.on('chat:open', () => this.toggle(true));
    ctx.bus.on('session:changed', () => this.#syncSession());
  }

  #syncSession() {
    const { session } = this.#ctx;
    const coupleId = session.coupleId;
    this.#marker = coupleId ? new ReadMarker(coupleId, session.uid) : null;
    if (!coupleId && this.#open) this.toggle(false);
    replace(this.#title, session.partner && avatar(session.partner, { size: 'sm' }), h('span', {}, session.partner ? session.nameOf(session.partner.uid) : ''));
    this.#render();
  }

  toggle(force = !this.#open) {
    this.#open = force;
    this.#panel.hidden = !force;
    this.el.classList.toggle('is-open', force);
    document.documentElement.classList.toggle('chat-open', force);
    this.#ctx.bus.emit('chat:toggled', force);
    if (force) {
      this.#render();
      this.#scrollToEnd();
      if (!matchMedia('(pointer: coarse)').matches) this.#input.focus();
    }
  }

  async #send() {
    const text = this.#input.value;
    if (!text.trim()) return;
    this.#input.value = '';
    this.#autoGrow();
    try {
      await this.#ctx.chatService.send(this.#ctx.session.coupleContext, text);
    } catch (error) {
      this.#input.value = text;
      this.#ctx.toaster.error(toUserMessage(error, 'Mesajul nu s-a trimis. Încearcă din nou.'));
    }
  }

  #render() {
    const { hub, session } = this.#ctx;
    const messages = hub.messages;

    if (this.#open && this.#marker && messages.length) this.#marker.markRead(toMillis(messages.at(-1).createdAt));
    const unread = this.#marker ? this.#marker.unreadCount(messages, session.uid) : 0;
    this.#badge.hidden = unread === 0;
    this.#badge.textContent = unread > 9 ? '9+' : String(unread);

    if (!this.#open) return;
    const nearBottom = this.#list.scrollHeight - this.#list.scrollTop - this.#list.clientHeight < 120;

    if (!messages.length) {
      replace(this.#list, h('li', { class: 'chat__empty' }, `Primul mesaj către ${session.nameOf(session.partner?.uid)}. Fă-l memorabil.`));
      return;
    }

    const items = [];
    messages.forEach((message, index) => {
      const previous = messages[index - 1];
      if (!previous || !sameDay(previous.createdAt, message.createdAt)) {
        items.push(h('li', { class: 'chat__day' }, formatLong(message.createdAt)));
      }
      const mine = message.senderId === session.uid;
      const grouped = previous && previous.senderId === message.senderId && sameDay(previous.createdAt, message.createdAt);
      items.push(
        h(
          'li',
          { class: `msg ${mine ? 'msg--mine' : 'msg--theirs'} ${grouped ? 'is-grouped' : ''}` },
          h('p', { class: 'msg__text' }, message.text),
          h('time', { class: 'msg__time' }, formatTime(message.createdAt)),
        ),
      );
    });
    replace(this.#list, items);
    if (nearBottom || messages.at(-1)?.senderId === session.uid) this.#scrollToEnd();
  }

  #scrollToEnd() {
    requestAnimationFrame(() => (this.#list.scrollTop = this.#list.scrollHeight));
  }

  #autoGrow() {
    this.#input.style.height = 'auto';
    this.#input.style.height = `${Math.min(this.#input.scrollHeight, 140)}px`;
  }
}
