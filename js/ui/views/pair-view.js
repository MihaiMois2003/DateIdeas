import { View } from './view.js';
import { h, replace, withBusy } from '../dom.js';
import { icon } from '../icons.js';
import { avatar } from '../components/bits.js';
import { toUserMessage } from '../../core/errors.js';

/** Căutarea partenerului, cererea trimisă și cererile primite. */
export class PairView extends View {
  #result = h('div', { class: 'pair__result', 'aria-live': 'polite' });
  #incoming = h('div', { class: 'stack' });
  #outgoing = h('div', { class: 'stack' });

  render() {
    const { session } = this.ctx;
    const me = session.me;

    const input = h('input', {
      class: 'field__input field__input--handle',
      placeholder: 'username',
      autocomplete: 'off',
      autocapitalize: 'none',
      spellcheck: 'false',
      'aria-label': 'Username-ul partenerului',
    });
    const searchButton = h('button', { class: 'button button--primary button--square', type: 'submit', 'aria-label': 'Caută' }, icon('search'));

    const form = h(
      'form',
      { class: 'search', onsubmit: (event) => (event.preventDefault(), this.#search(input.value, searchButton)) },
      h('span', { class: 'field__prefix-wrap' }, h('span', { class: 'field__prefix', 'aria-hidden': 'true' }, '@'), input),
      searchButton,
    );

    this.listen('requests:changed', () => this.#renderRequests());
    this.#renderRequests();

    return h(
      'section',
      { class: 'narrow pair' },
      h('h1', { class: 'display' }, 'Găsește-ți jumătatea'),
      h('p', { class: 'lede' }, 'Caută-l sau caut-o după username și trimite o cerere. După ce o acceptă, aveți un spațiu doar al vostru.'),
      h('div', { class: 'handle-card' }, avatar(me, { size: 'md' }), h('div', {}, h('p', { class: 'handle-card__label' }, 'Tu ești'), h('p', { class: 'handle-card__handle' }, `@${me.username}`))),
      form,
      this.#result,
      this.#incoming,
      this.#outgoing,
      h('button', { class: 'link-button', type: 'button', onclick: () => this.ctx.authService.signOut() }, icon('logout', { size: 18 }), 'Deconectează-te'),
    );
  }

  async #search(value, button) {
    const { pairingService, session } = this.ctx;
    await withBusy(button, async () => {
      try {
        const found = await pairingService.search(value);
        if (!found) {
          replace(this.#result, h('p', { class: 'muted' }, 'Nu există niciun cont cu acest username. Verifică literele și încearcă din nou.'));
          return;
        }
        this.#showCandidate(found, session.me);
      } catch (error) {
        this.ctx.toaster.error(toUserMessage(error));
      }
    });
  }

  #showCandidate(person, me) {
    const isMe = person.uid === me.uid;
    const send = h('button', { class: 'button button--primary', type: 'button', disabled: isMe || !!person.coupleId }, 'Trimite cererea');
    send.addEventListener('click', () =>
      withBusy(send, async () => {
        try {
          const couple = await this.ctx.pairingService.sendRequest(me, person);
          if (couple) await this.ctx.sessionController.refresh();
          else {
            replace(this.#result);
            this.ctx.toaster.show(`Cererea a plecat către @${person.username}.`, { tone: 'rose' });
          }
        } catch (error) {
          this.ctx.toaster.error(toUserMessage(error));
        }
      }),
    );

    const note = isMe ? 'Acesta e contul tău.' : person.coupleId ? 'Are deja un partener pe DateIdeas.' : null;
    replace(
      this.#result,
      h('div', { class: 'person-row' }, avatar(person), h('div', { class: 'person-row__text' }, h('p', { class: 'person-row__name' }, person.displayName), h('p', { class: 'muted' }, note || `@${person.username}`)), send),
    );
  }

  #renderRequests() {
    const { sessionController, pairingService, session, toaster } = this.ctx;
    const { incoming, outgoing } = sessionController.requests;

    replace(
      this.#incoming,
      incoming.length > 0 && h('h2', { class: 'section-title' }, 'Te caută cineva'),
      incoming.map((request) => {
        const accept = h('button', { class: 'button button--primary', type: 'button' }, 'Acceptă');
        const decline = h('button', { class: 'button button--ghost', type: 'button' }, 'Refuză');
        accept.addEventListener('click', () =>
          withBusy(accept, async () => {
            try {
              await pairingService.accept(request, session.me);
              await sessionController.refresh();
            } catch (error) {
              toaster.error(toUserMessage(error));
            }
          }),
        );
        decline.addEventListener('click', () => withBusy(decline, () => pairingService.decline(request).catch((e) => toaster.error(toUserMessage(e)))));
        return h(
          'div',
          { class: 'person-row person-row--invite' },
          avatar({ photoURL: request.fromPhoto, displayName: request.fromName }),
          h('div', { class: 'person-row__text' }, h('p', { class: 'person-row__name' }, request.fromName), h('p', { class: 'muted' }, `@${request.fromUsername} vrea să fiți pereche`)),
          h('div', { class: 'person-row__actions' }, decline, accept),
        );
      }),
    );

    replace(
      this.#outgoing,
      outgoing.length > 0 && h('h2', { class: 'section-title' }, 'Cererea ta'),
      outgoing.map((request) => {
        const cancel = h('button', { class: 'button button--ghost', type: 'button' }, 'Anulează');
        cancel.addEventListener('click', () => withBusy(cancel, () => pairingService.cancel(request).catch((e) => toaster.error(toUserMessage(e)))));
        return h(
          'div',
          { class: 'person-row' },
          avatar({ photoURL: request.toPhoto, displayName: request.toName }),
          h('div', { class: 'person-row__text' }, h('p', { class: 'person-row__name' }, request.toName), h('p', { class: 'muted' }, `Așteaptă răspunsul lui @${request.toUsername}`)),
          cancel,
        );
      }),
    );
  }
}
