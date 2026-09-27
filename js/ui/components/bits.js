import { h } from '../dom.js';
import { icon } from '../icons.js';
import { firstName } from '../../core/session.js';

export function avatar(person, { size = 'md' } = {}) {
  const name = firstName(person);
  const initial = name.charAt(0).toUpperCase();
  return h(
    'span',
    { class: `avatar avatar--${size}`, title: name },
    person?.photoURL
      ? h('img', { src: person.photoURL, alt: '', referrerpolicy: 'no-referrer', loading: 'lazy' })
      : h('span', { class: 'avatar__initial', 'aria-hidden': 'true' }, initial),
  );
}

/** Două avatare legate printr-un fir cu o inimă. */
export function coupleMark(me, partner, { size = 'lg' } = {}) {
  return h(
    'div',
    { class: `couple-mark couple-mark--${size}` },
    avatar(me, { size }),
    h('span', { class: 'couple-mark__thread', 'aria-hidden': 'true' }, icon('heart', { size: 16, filled: true })),
    avatar(partner, { size }),
  );
}

/**
 * Selector de poze cu previzualizare. Pe iPhone deschide galeria sau camera.
 * Expune `files` (lista curentă) și `el` (elementul DOM).
 */
export class PhotoPicker {
  files = [];
  #urls = [];
  #multiple;
  #max;
  #grid;
  #input;

  constructor({ multiple = false, max = 1, label = 'Adaugă o poză' } = {}) {
    this.#multiple = multiple;
    this.#max = max;
    this.#input = h('input', {
      type: 'file',
      accept: 'image/*',
      multiple,
      class: 'visually-hidden',
      onchange: (event) => this.#add([...event.target.files]),
    });
    this.#grid = h('div', { class: 'picker__grid' });
    this.el = h(
      'div',
      { class: `picker ${multiple ? 'picker--multi' : 'picker--single'}` },
      this.#grid,
      h('label', { class: 'picker__add' }, this.#input, icon('camera'), h('span', {}, label)),
    );
  }

  #add(newFiles) {
    const images = newFiles.filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
    this.files = this.#multiple ? [...this.files, ...images].slice(0, this.#max) : images.slice(0, 1);
    this.#input.value = '';
    this.#render();
  }

  #remove(index) {
    this.files.splice(index, 1);
    this.#render();
  }

  #render() {
    this.#urls.forEach((url) => URL.revokeObjectURL(url));
    this.#urls = this.files.map((file) => URL.createObjectURL(file));
    this.#grid.replaceChildren(
      ...this.#urls.map((url, index) =>
        h(
          'div',
          { class: 'picker__item' },
          h('img', { src: url, alt: '' }),
          h('button', { class: 'picker__remove', type: 'button', 'aria-label': 'Scoate poza', onclick: () => this.#remove(index) }, icon('close', { size: 16 })),
        ),
      ),
    );
    this.el.classList.toggle('has-files', this.files.length > 0);
    this.el.classList.toggle('is-full', this.files.length >= this.#max);
  }

  dispose() {
    this.#urls.forEach((url) => URL.revokeObjectURL(url));
  }
}

export function emptyState({ title, text, action }) {
  return h('div', { class: 'empty' }, h('p', { class: 'empty__title' }, title), text && h('p', { class: 'empty__text' }, text), action);
}

export function spinner(label = 'Se încarcă') {
  return h('div', { class: 'loading', role: 'status' }, h('span', { class: 'loading__heart', 'aria-hidden': 'true' }, icon('heart', { size: 28, filled: true })), h('span', { class: 'visually-hidden' }, label));
}
