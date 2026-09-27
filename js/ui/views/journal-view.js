import { View } from './view.js';
import { h, replace } from '../dom.js';
import { icon } from '../icons.js';
import { avatar, emptyState, spinner } from '../components/bits.js';
import { polaroid } from '../components/cards.js';
import { formatMonthYear, toDate, plural } from '../format.js';

const dayNumber = new Intl.DateTimeFormat('ro-RO', { day: 'numeric' });
const weekday = new Intl.DateTimeFormat('ro-RO', { weekday: 'short' });

/** Albumul vostru: date-urile făcute, de la cel mai recent, grupate pe luni. */
export class JournalView extends View {
  #timeline = h('div', { class: 'timeline' });
  #count = h('p', { class: 'lede lede--tight' });
  #entries = new Map();

  render() {
    this.listen('ideas:changed', () => this.#paint());
    this.#paint();
    return h(
      'section',
      { class: 'page journal' },
      h('header', { class: 'page__header' }, h('div', {}, h('h1', { class: 'display' }, 'Jurnalul nostru'), this.#count)),
      this.#timeline,
    );
  }

  get #done() {
    return this.ctx.hub.ideas
      .filter((i) => i.status === 'done')
      .sort((a, b) => (toDate(b.doneDate)?.getTime() || 0) - (toDate(a.doneDate)?.getTime() || 0));
  }

  async #paint() {
    const { hub } = this.ctx;
    if (!hub.loaded.ideas) {
      replace(this.#timeline, spinner());
      return;
    }
    const done = this.#done;
    this.#count.textContent = done.length ? `${plural(done.length, 'date făcut', 'date-uri făcute')} împreună.` : '';

    if (!done.length) {
      replace(
        this.#timeline,
        emptyState({
          title: 'Prima pagină așteaptă',
          text: 'Când bifați un bilet ca făcut, apare aici cu pozele și notițele voastre.',
          action: h('a', { class: 'button button--primary', href: '#/ideas' }, 'Alege o idee'),
        }),
      );
      return;
    }

    this.#draw(done);
    const missing = done.filter((idea) => !this.#entries.has(idea.id));
    if (!missing.length) return;
    const loaded = await Promise.all(missing.map((idea) => this.ctx.entryService.list(idea.id).catch(() => [])));
    missing.forEach((idea, i) => this.#entries.set(idea.id, loaded[i]));
    this.#draw(this.#done);
  }

  #draw(done) {
    const groups = new Map();
    for (const idea of done) {
      const key = formatMonthYear(idea.doneDate);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(idea);
    }
    replace(
      this.#timeline,
      [...groups].map(([month, ideas]) =>
        h('section', { class: 'timeline__month' }, h('h2', { class: 'timeline__label' }, month), ideas.map((idea) => this.#page(idea))),
      ),
    );
  }

  #page(idea) {
    const { session, router } = this.ctx;
    const entries = this.#entries.get(idea.id);
    const photos = (entries || []).flatMap((e) => e.photos || []);
    const cover = photos[0] || (idea.imageUrl ? { url: idea.imageUrl } : null);
    const date = toDate(idea.doneDate);

    const notes = [session.me, session.partner]
      .filter(Boolean)
      .map((person) => ({ person, entry: (entries || []).find((e) => e.authorId === person.uid && e.note) }))
      .filter((x) => x.entry);

    return h(
      'button',
      { class: 'journal-page', type: 'button', onclick: () => router.navigate(`/idea/${idea.id}`) },
      h('span', { class: 'journal-page__date' }, h('strong', {}, date ? dayNumber.format(date) : ''), h('small', {}, date ? weekday.format(date) : '')),
      h(
        'span',
        { class: 'journal-page__body' },
        cover ? polaroid(cover, idea.title.length, {}) : h('span', { class: 'journal-page__blank', 'aria-hidden': 'true' }, icon('heart', { size: 28 })),
        h(
          'span',
          { class: 'journal-page__text' },
          h('span', { class: 'journal-page__title' }, idea.title),
          notes.map(({ person, entry }) =>
            h('span', { class: 'journal-page__note' }, avatar(person, { size: 'xs' }), h('span', {}, entry.note.length > 120 ? `${entry.note.slice(0, 120)}…` : entry.note)),
          ),
          entries && h('span', { class: 'journal-page__meta' }, photos.length ? plural(photos.length, 'poză', 'poze') : 'Încă fără poze'),
        ),
      ),
    );
  }
}
