import { h, replace } from '../dom.js';
import { icon } from '../icons.js';
import { PhotoPicker } from './bits.js';
import { toUserMessage } from '../../core/errors.js';

const AUTO_MIN_LENGTH = 3;
const MANUAL_MIN_LENGTH = 2;
const DEBOUNCE_MS = 600;
const SKELETON_TILES = 6;

const SOURCE_LABELS = { places: 'Loc', pixabay: 'Pixabay' };
const SOURCE_NAMES = { places: 'Google Maps', pixabay: 'Pixabay' };

/**
 * Grilă de poze sugerate pentru o idee, căutate după titlu (sau după ce scrii în căutare).
 * O singură selecție; `selected` e sugestia aleasă, `first()` e prima sugestie disponibilă.
 */
export class ImageSuggestions {
  #service;
  #onSelect;
  #autoFirst;
  #input;
  #body = h('div', { class: 'suggestions__body', 'aria-live': 'polite' });
  #items = [];
  #selectedKey = null;
  #state = 'idle';
  #error = '';
  #followTitle = true;
  #timer = null;
  #seq = 0;
  #pending = Promise.resolve();
  #lastQuery = '';

  constructor({ service, query = '', autoFirst = false, onSelect = () => {} }) {
    this.#service = service;
    this.#onSelect = onSelect;
    this.#autoFirst = autoFirst;
    this.#input = h('input', {
      class: 'field__input field__input--small',
      type: 'search',
      enterkeyhint: 'search',
      maxlength: 80,
      value: query,
      placeholder: 'Caută poze (ex. patinaj, Castelul Corvinilor)',
      'aria-label': 'Caută poze',
      'data-no-autofocus': true,
      oninput: () => this.#onType(),
      onkeydown: (event) => event.key === 'Enter' && (event.preventDefault(), this.#run(MANUAL_MIN_LENGTH)),
    });
    this.el = h(
      'div',
      { class: 'suggestions' },
      h('label', { class: 'suggestions__search' }, icon('search', { size: 18 }), this.#input),
      this.#body,
    );
    this.#paint();
    if (query) this.#schedule();
  }

  get selected() {
    return this.#items.find((item) => ImageSuggestions.#key(item) === this.#selectedKey) ?? null;
  }

  clearSelection() {
    if (this.#selectedKey === null) return;
    this.#selectedKey = null;
    this.#paint();
  }

  /** Titlul ideii devine căutarea, cât timp n-ai scris tu altceva în câmpul de căutare. */
  setTitle(title) {
    if (!this.#followTitle) return;
    this.#input.value = title;
    this.#schedule();
  }

  /** Prima sugestie; dacă o căutare e în curs (sau abia programată), o așteaptă cel mult `timeoutMs`. */
  async first({ timeoutMs = 6000 } = {}) {
    if (this.#timer || this.#query !== this.#lastQuery) this.#run(MANUAL_MIN_LENGTH);
    if (this.#state === 'loading') {
      await Promise.race([this.#pending, new Promise((resolve) => setTimeout(resolve, timeoutMs))]);
    }
    return this.#items[0] ?? null;
  }

  dispose() {
    clearTimeout(this.#timer);
    this.#seq++;
  }

  get #query() {
    return this.#input.value.trim().replace(/\s+/g, ' ');
  }

  #onType() {
    // Câmpul golit revine la titlu; altfel căutarea ta are prioritate.
    this.#followTitle = this.#query === '';
    this.#schedule();
  }

  #schedule() {
    clearTimeout(this.#timer);
    this.#timer = null;
    if (this.#query.length < AUTO_MIN_LENGTH) {
      this.#seq++;
      this.#lastQuery = '';
      this.#items = [];
      this.#selectedKey = null;
      this.#state = 'idle';
      this.#paint();
      return;
    }
    this.#timer = setTimeout(() => this.#run(AUTO_MIN_LENGTH), DEBOUNCE_MS);
  }

  #run(minLength) {
    clearTimeout(this.#timer);
    this.#timer = null;
    const query = this.#query;
    if (query.length < minLength) return this.#pending;
    if (query === this.#lastQuery && this.#state !== 'error') return this.#pending;

    const seq = ++this.#seq;
    this.#lastQuery = query;
    this.#state = 'loading';
    this.#paint();

    this.#pending = this.#service.search(query).then(
      (items) => {
        if (seq !== this.#seq) return;
        this.#items = items;
        if (!this.selected) this.#selectedKey = null;
        this.#state = items.length ? 'ready' : 'empty';
        this.#paint();
      },
      (error) => {
        if (seq !== this.#seq) return;
        this.#items = [];
        this.#selectedKey = null;
        this.#state = 'error';
        this.#error = toUserMessage(error, 'Nu am putut căuta poze acum.');
        this.#paint();
      },
    );
    return this.#pending;
  }

  #toggle(item) {
    const key = ImageSuggestions.#key(item);
    this.#selectedKey = this.#selectedKey === key ? null : key;
    this.#paint();
    if (this.#selectedKey) this.#onSelect(item);
  }

  #paint() {
    switch (this.#state) {
      case 'loading':
        replace(
          this.#body,
          h('div', { class: 'suggestions__grid', 'aria-busy': 'true' },
            Array.from({ length: SKELETON_TILES }, () => h('span', { class: 'suggestion suggestion--skeleton', 'aria-hidden': 'true' }))),
          h('span', { class: 'visually-hidden', role: 'status' }, 'Caut poze'),
        );
        return;
      case 'empty':
        replace(this.#body, h('p', { class: 'suggestions__message' }, 'N-am găsit poze. Încearcă alte cuvinte sau pune una din telefon.'));
        return;
      case 'error':
        replace(
          this.#body,
          h('p', { class: 'suggestions__message' }, this.#error,
            h('button', { class: 'link-button link-button--small', type: 'button', onclick: () => this.#run(MANUAL_MIN_LENGTH) }, 'Încearcă din nou')),
        );
        return;
      case 'ready':
        replace(this.#body, this.#grid(), this.#note());
        return;
      default:
        replace(this.#body, h('p', { class: 'suggestions__note' }, 'Scrie ce vreți să faceți și îți arăt câteva poze.'));
    }
  }

  #grid() {
    return h(
      'div',
      { class: 'suggestions__grid', role: 'group', 'aria-label': 'Poze sugerate' },
      this.#items.map((item) => {
        const selected = ImageSuggestions.#key(item) === this.#selectedKey;
        return h(
          'button',
          {
            class: `suggestion ${selected ? 'is-selected' : ''}`,
            type: 'button',
            'aria-pressed': String(selected),
            'aria-label': `${item.label || 'Poză'} (${SOURCE_LABELS[item.source]})`,
            title: item.credit?.name ? `${item.label} · foto: ${item.credit.name}` : item.label,
            onclick: () => this.#toggle(item),
          },
          h('img', {
            src: item.thumbUrl,
            alt: '',
            loading: 'lazy',
            referrerpolicy: 'no-referrer',
            onerror: (event) => (event.currentTarget.parentElement.hidden = true),
          }),
          h('span', { class: `suggestion__source suggestion__source--${item.source}` }, SOURCE_LABELS[item.source]),
          selected && h('span', { class: 'suggestion__check', 'aria-hidden': 'true' }, icon('check', { size: 16 })),
        );
      }),
    );
  }

  #note() {
    const selected = this.selected;
    if (selected) return creditLine(selected.credit, selected.source, { className: 'suggestions__note' });
    return this.#autoFirst ? h('p', { class: 'suggestions__note' }, 'Dacă nu alegi nimic, punem prima poză.') : null;
  }

  static #key(item) {
    return `${item.source}:${item.id}`;
  }
}

/** „Foto: autor · Pixabay”, cu link la autor (cerut de Google și de Pixabay). */
export function creditLine(credit, source, { className = '' } = {}) {
  if (!credit?.name) return null;
  const sourceName = SOURCE_NAMES[source];
  const text = sourceName && credit.name !== sourceName ? `Foto: ${credit.name} · ${sourceName}` : `Foto: ${credit.name}`;
  const safeUrl = /^https:\/\//i.test(credit.url || '') ? credit.url : null;
  return safeUrl
    ? h('a', { class: className, href: safeUrl, target: '_blank', rel: 'noopener noreferrer' }, text)
    : h('span', { class: className }, text);
}

/**
 * Câmpul complet de poză: sugestii + upload din telefon, cu o singură alegere activă.
 * `choice()` întoarce ce se salvează: { file }, { suggestion }, { suggestion, auto: true } sau null.
 */
export class ImageChoiceField {
  #picker;
  #suggestions;
  #autoFirst;

  constructor({ service, query = '', autoFirst = false }) {
    this.#autoFirst = autoFirst;
    this.#picker = new PhotoPicker({
      label: 'Pune una din telefon',
      onChange: (files) => files.length && this.#suggestions.clearSelection(),
    });
    this.#suggestions = new ImageSuggestions({ service, query, autoFirst, onSelect: () => this.#picker.clear() });
    this.el = h(
      'div',
      { class: 'image-choice' },
      this.#suggestions.el,
      h('p', { class: 'image-choice__or' }, h('span', {}, 'sau')),
      this.#picker.el,
    );
  }

  setTitle(title) {
    this.#suggestions.setTitle(title);
  }

  async choice({ timeoutMs = 6000 } = {}) {
    const file = this.#picker.files[0];
    if (file) return { file };
    const selected = this.#suggestions.selected;
    if (selected) return { suggestion: selected };
    if (!this.#autoFirst) return null;
    const first = await this.#suggestions.first({ timeoutMs });
    return first ? { suggestion: first, auto: true } : null;
  }

  dispose() {
    this.#picker.dispose();
    this.#suggestions.dispose();
  }
}
