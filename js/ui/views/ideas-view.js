import { View } from './view.js';
import { h, replace } from '../dom.js';
import { icon } from '../icons.js';
import { ticketCard } from '../components/cards.js';
import { emptyState, spinner } from '../components/bits.js';
import { openIdeaForm } from './idea-form.js';
import { toUserMessage } from '../../core/errors.js';
import { plural } from '../format.js';

const ALL = '__all__';

/** Board-ul comun de idei: filtre pe categorii, „Surprinde-ne” și butonul de idee nouă. */
export class IdeasView extends View {
  #category = ALL;
  #showDone = false;
  #grid = h('div', { class: 'ticket-grid' });
  #chips = h('div', { class: 'chips chips--scroll', role: 'tablist', 'aria-label': 'Filtrează după categorie' });
  #summary = h('p', { class: 'lede lede--tight' });
  #doneToggle;

  render() {
    this.#doneToggle = h('button', { class: 'toggle', type: 'button', 'aria-pressed': 'false', onclick: () => this.#toggleDone() }, 'Arată și ce am făcut');

    this.listen('ideas:changed', () => this.#paint());
    this.#paint();

    return h(
      'section',
      { class: 'page ideas' },
      h(
        'header',
        { class: 'page__header' },
        h('div', {}, h('h1', { class: 'display' }, 'Idei pentru noi doi'), this.#summary),
        h('button', { class: 'button button--gold', type: 'button', onclick: () => this.#surprise() }, icon('sparkle', { size: 20 }), 'Surprinde-ne'),
      ),
      h('div', { class: 'filters' }, this.#chips, this.#doneToggle),
      this.#grid,
      h('button', { class: 'fab', type: 'button', 'aria-label': 'Idee nouă', onclick: () => openIdeaForm(this.ctx) }, icon('plus', { size: 28 })),
    );
  }

  #toggleDone() {
    this.#showDone = !this.#showDone;
    this.#doneToggle.setAttribute('aria-pressed', String(this.#showDone));
    this.#paint();
  }

  #paint() {
    const { hub, ideaService, session, toaster } = this.ctx;
    const ideas = hub.ideas;
    const pending = ideas.filter((i) => i.status !== 'done');
    const done = ideas.length - pending.length;

    this.#summary.textContent = ideas.length
      ? `${plural(pending.length, 'idee de încercat', 'idei de încercat')}, ${plural(done, 'amintire', 'amintiri')} în jurnal.`
      : 'Primul bilet îl scrieți acum.';

    const categories = ideaService.categoriesFrom(ideas).filter((c) => ideas.some((i) => i.category === c));
    if (this.#category !== ALL && !categories.includes(this.#category)) this.#category = ALL;
    replace(
      this.#chips,
      [ALL, ...categories].map((name) =>
        h('button', {
          class: `chip ${name === this.#category ? 'is-active' : ''}`,
          type: 'button',
          role: 'tab',
          'aria-selected': String(name === this.#category),
          onclick: () => {
            this.#category = name;
            this.#paint();
          },
        }, name === ALL ? 'Toate' : name),
      ),
    );

    if (!hub.loaded.ideas) {
      replace(this.#grid, spinner());
      return;
    }

    const visible = ideas
      .filter((i) => this.#showDone || i.status !== 'done')
      .filter((i) => this.#category === ALL || i.category === this.#category)
      .sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0) || (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

    if (!visible.length) {
      replace(
        this.#grid,
        emptyState({
          title: ideas.length ? 'Nimic aici încă' : 'Lista voastră e goală',
          text: ideas.length ? 'Schimbă filtrul sau adaugă o idee nouă în categoria asta.' : `Scrie prima idee de date. ${session.nameOf(session.partner?.uid)} o vede imediat.`,
          action: h('button', { class: 'button button--primary', type: 'button', onclick: () => openIdeaForm(this.ctx) }, icon('plus', { size: 20 }), 'Adaugă o idee'),
        }),
      );
      return;
    }

    replace(
      this.#grid,
      visible.map((idea) =>
        ticketCard(idea, {
          session,
          onOpen: () => this.ctx.router.navigate(`/idea/${idea.id}`),
          onLike: () => ideaService.toggleLike(idea, session.uid).catch((e) => toaster.error(toUserMessage(e))),
        }),
      ),
    );
  }

  #surprise() {
    const pick = this.ctx.ideaService.pickSurprise(this.ctx.hub.ideas);
    if (!pick) {
      this.ctx.toaster.show('Adăugați mai întâi câteva idei, apoi vă surprind eu.');
      return;
    }
    this.ctx.router.navigate(`/idea/${pick.id}?surpriza`);
  }
}
