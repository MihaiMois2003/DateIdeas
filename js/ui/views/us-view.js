import { View } from './view.js';
import { h, replace, withBusy } from '../dom.js';
import { icon } from '../icons.js';
import { coupleMark } from '../components/bits.js';
import { toUserMessage } from '../../core/errors.js';
import { daysBetween, formatLong, fromInputDate, toInputDate } from '../format.js';

export class UsView extends View {
  #together = h('div', { class: 'together' });
  #stats = h('dl', { class: 'stats' });

  render() {
    const { session } = this.ctx;
    this.listen('session:changed', () => this.#paintTogether());
    this.listen('ideas:changed', () => this.#paintStats());
    this.#paintTogether();
    this.#paintStats();

    return h(
      'section',
      { class: 'narrow us' },
      coupleMark(session.me, session.partner, { size: 'xl' }),
      h('h1', { class: 'display display--center' }, `${session.nameOf(session.uid)} și ${session.nameOf(session.partner?.uid)}`),
      h('p', { class: 'muted center' }, `@${session.me.username} și @${session.partner?.username}`),
      this.#together,
      this.#stats,
      h('button', { class: 'link-button', type: 'button', onclick: () => this.ctx.authService.signOut() }, icon('logout', { size: 18 }), 'Deconectează-te'),
    );
  }

  #paintTogether() {
    const { session, coupleRepository, toaster } = this.ctx;
    const anniversary = session.couple?.anniversary;
    const input = h('input', { class: 'field__input', type: 'date', value: anniversary || '', max: toInputDate(), 'aria-label': 'Data de când sunteți împreună' });
    const save = h('button', { class: 'button button--soft', type: 'button' }, anniversary ? 'Schimbă' : 'Salvează');
    save.addEventListener('click', () =>
      withBusy(save, async () => {
        if (!fromInputDate(input.value)) {
          toaster.error('Alege o dată din calendar.');
          return;
        }
        try {
          await coupleRepository.setAnniversary(session.coupleId, input.value);
        } catch (error) {
          toaster.error(toUserMessage(error));
        }
      }),
    );

    const days = anniversary ? daysBetween(fromInputDate(anniversary)) : null;
    replace(
      this.#together,
      days !== null
        ? h('div', { class: 'together__count' }, h('span', { class: 'together__number' }, days.toLocaleString('ro-RO')), h('span', { class: 'together__label' }, `${days === 1 ? 'zi' : 'zile'} împreună, din ${formatLong(fromInputDate(anniversary))}`))
        : h('p', { class: 'together__prompt' }, 'De când sunteți împreună?'),
      h('div', { class: 'inline-add' }, input, save),
    );
  }

  #paintStats() {
    const ideas = this.ctx.hub.ideas;
    const done = ideas.filter((i) => i.status === 'done').length;
    const both = ideas.filter((i) => (i.likes || []).length === 2 && i.status !== 'done').length;
    const stat = (value, label) => h('div', { class: 'stats__item' }, h('dt', {}, label), h('dd', {}, String(value)));
    replace(
      this.#stats,
      stat(done, done === 1 ? 'date făcut' : 'date-uri făcute'),
      stat(ideas.length - done, ideas.length - done === 1 ? 'idee în așteptare' : 'idei în așteptare'),
      stat(both, both === 1 ? 'vă place amândurora' : 'vă plac amândurora'),
    );
  }
}
