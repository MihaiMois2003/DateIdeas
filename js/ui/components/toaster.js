import { h } from '../dom.js';

export class Toaster {
  #root;

  constructor(root) {
    this.#root = root;
  }

  show(message, { tone = 'plain', timeout = 4200, action = null } = {}) {
    const toast = h(
      'div',
      { class: `toast toast--${tone}`, role: 'status' },
      h('span', { class: 'toast__text' }, message),
      action &&
        h('button', {
          class: 'toast__action',
          type: 'button',
          onclick: () => {
            action.run();
            dismiss();
          },
        }, action.label),
    );

    const dismiss = () => {
      toast.classList.remove('is-in');
      setTimeout(() => toast.remove(), 350);
    };

    toast.addEventListener('click', (event) => event.target === toast && dismiss());
    this.#root.append(toast);
    requestAnimationFrame(() => toast.classList.add('is-in'));
    setTimeout(dismiss, timeout);
  }

  error(message) {
    this.show(message, { tone: 'error', timeout: 5200 });
  }
}
