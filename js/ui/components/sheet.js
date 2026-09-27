import { h } from '../dom.js';
import { icon } from '../icons.js';

let openCount = 0;

/**
 * Panou modal: urcă de jos pe telefon, apare centrat pe ecrane mari.
 * Se închide cu butonul, cu Escape sau atingând fundalul.
 */
export class Sheet {
  #overlay;
  #onClose;
  #keyHandler = (event) => event.key === 'Escape' && this.close();

  static open(options) {
    return new Sheet(options);
  }

  constructor({ title, content, onClose = () => {}, variant = '' }) {
    this.#onClose = onClose;
    const panel = h(
      'div',
      { class: `sheet ${variant}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title || 'Fereastră' },
      h('div', { class: 'sheet__grip', 'aria-hidden': 'true' }),
      h(
        'header',
        { class: 'sheet__header' },
        title ? h('h2', { class: 'sheet__title' }, title) : h('span'),
        h('button', { class: 'icon-button', type: 'button', 'aria-label': 'Închide', onclick: () => this.close() }, icon('close')),
      ),
      h('div', { class: 'sheet__body' }, content),
    );

    this.#overlay = h('div', { class: 'overlay', onclick: (e) => e.target === this.#overlay && this.close() }, panel);
    document.body.append(this.#overlay);
    document.addEventListener('keydown', this.#keyHandler);
    if (openCount++ === 0) document.documentElement.classList.add('is-locked');
    requestAnimationFrame(() => this.#overlay.classList.add('is-open'));
    setTimeout(() => panel.querySelector('input:not([type=file]), textarea')?.focus({ preventScroll: true }), 320);
  }

  close() {
    if (!this.#overlay) return;
    const overlay = this.#overlay;
    this.#overlay = null;
    document.removeEventListener('keydown', this.#keyHandler);
    if (--openCount === 0) document.documentElement.classList.remove('is-locked');
    overlay.classList.remove('is-open');
    setTimeout(() => overlay.remove(), 320);
    this.#onClose();
  }
}

/** Vizualizare foto pe tot ecranul. */
export function openLightbox(url, caption = '') {
  const figure = h(
    'figure',
    { class: 'lightbox' },
    h('img', { src: url, alt: caption || 'Poză' }),
    caption && h('figcaption', {}, caption),
  );
  return Sheet.open({ content: figure, variant: 'sheet--photo' });
}

/** Confirmare simplă înaintea acțiunilor ireversibile. */
export function confirmAction({ title, message, confirmLabel, tone = 'danger' }) {
  return new Promise((resolve) => {
    let answered = false;
    const finish = (value) => {
      if (answered) return;
      answered = true;
      resolve(value);
      sheet.close();
    };
    const content = h(
      'div',
      { class: 'confirm' },
      h('p', {}, message),
      h(
        'div',
        { class: 'confirm__actions' },
        h('button', { class: 'button button--ghost', type: 'button', onclick: () => finish(false) }, 'Renunță'),
        h('button', { class: `button button--${tone}`, type: 'button', onclick: () => finish(true) }, confirmLabel),
      ),
    );
    const sheet = Sheet.open({ title, content, variant: 'sheet--compact', onClose: () => finish(false) });
  });
}
