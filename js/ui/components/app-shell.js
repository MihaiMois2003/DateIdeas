import { h } from '../dom.js';
import { icon } from '../icons.js';
import { Phase } from '../../core/session.js';
import { ChatWidget } from './chat-widget.js';

const TABS = [
  { path: '/ideas', match: ['/ideas', '/idea'], label: 'Idei', icon: 'ticket' },
  { path: '/journal', match: ['/journal'], label: 'Jurnal', icon: 'album' },
  { path: '/us', match: ['/us'], label: 'Noi', icon: 'us' },
];

/** Structura permanentă a paginii: navigarea, zona pentru ecrane și bula de chat. */
export class AppShell {
  #ctx;
  #links = [];

  constructor(ctx) {
    this.#ctx = ctx;
    this.outlet = h('main', { class: 'outlet', id: 'main' });

    this.#links = TABS.map((tab) =>
      h('a', { class: 'tabbar__link', href: `#${tab.path}`, dataset: { match: tab.match.join(',') } }, icon(tab.icon, { size: 24 }), h('span', {}, tab.label)),
    );

    const nav = h(
      'nav',
      { class: 'tabbar', 'aria-label': 'Navigare principală' },
      h('a', { class: 'tabbar__brand', href: '#/ideas' }, 'DateIdeas'),
      h('div', { class: 'tabbar__links' }, this.#links),
    );

    this.chat = new ChatWidget(ctx);
    this.el = h('div', { class: 'app' }, h('a', { class: 'skip-link', href: '#main' }, 'Sari la conținut'), nav, this.outlet, this.chat.el);

        ctx.bus.on('session:changed', () => this.#sync());
  }

  #sync() {
    const paired = this.#ctx.session.phase === Phase.PAIRED;
    document.documentElement.classList.toggle('is-paired', paired);
    this.highlight();
  }

  highlight() {
    const path = location.hash.slice(1) || '/';
    this.#links.forEach((link) => {
      const active = link.dataset.match.split(',').some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }
}
