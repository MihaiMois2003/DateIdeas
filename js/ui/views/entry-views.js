import { View } from './view.js';
import { h, withBusy } from '../dom.js';
import { googleMark, icon } from '../icons.js';
import { avatar, spinner } from '../components/bits.js';
import { toUserMessage } from '../../core/errors.js';
import { normalizeUsername, USERNAME_PATTERN } from '../../services/profile-service.js';

export class SplashView extends View {
  render() {
    return h('section', { class: 'splash' }, h('p', { class: 'wordmark' }, 'DateIdeas'), spinner());
  }
}

export class LoginView extends View {
  render() {
    const { authService, toaster } = this.ctx;
    const button = h(
      'button',
      {
        class: 'button button--google',
        type: 'button',
        onclick: () =>
          withBusy(button, () => authService.signIn().catch((error) => toaster.error(toUserMessage(error)))),
      },
      googleMark(),
      'Continuă cu Google',
    );

    return h(
      'section',
      { class: 'login' },
      h(
        'div',
        { class: 'login__tickets', 'aria-hidden': 'true' },
        h('div', { class: 'mini-ticket mini-ticket--back' }, h('span', {}, 'Picnic la apus'), h('small', {}, 'Intrare pentru doi')),
        h('div', { class: 'mini-ticket mini-ticket--front' }, h('span', {}, 'Cină pe acoperiș'), h('small', {}, 'Intrare pentru doi')),
      ),
      h('h1', { class: 'wordmark wordmark--hero' }, 'DateIdeas'),
      h('p', { class: 'login__lede' }, 'Locul în care strângeți ideile de ieșit în doi și păstrați amintirile de după.'),
      button,
      h('p', { class: 'login__fine' }, 'Tot ce adăugați e vizibil doar pentru voi doi.'),
    );
  }
}

export class WelcomeView extends View {
  render() {
    const { session, profileService, sessionController, toaster } = this.ctx;
    const authUser = session.state.authUser;
    const suggestion = normalizeUsername((authUser.email || '').split('@')[0]).replace(/[^a-z0-9._]/g, '').slice(0, 20);

    const hint = h('p', { class: 'field__hint' }, 'Litere mici, cifre, punct sau underscore. Între 3 și 20 de caractere.');
    const input = h('input', {
      class: 'field__input field__input--handle',
      id: 'username',
      name: 'username',
      autocomplete: 'off',
      autocapitalize: 'none',
      spellcheck: 'false',
      maxlength: 21,
      value: USERNAME_PATTERN.test(suggestion) ? suggestion : '',
      oninput: () => {
        const clean = normalizeUsername(input.value);
        hint.classList.toggle('is-error', clean.length > 0 && !USERNAME_PATTERN.test(clean));
      },
    });

    const submit = h('button', { class: 'button button--primary', type: 'submit' }, 'Păstrează numele');

    const form = h(
      'form',
      {
        class: 'stack',
        onsubmit: (event) => {
          event.preventDefault();
          withBusy(submit, async () => {
            try {
              await profileService.claimUsername(authUser, input.value);
              await sessionController.refresh();
            } catch (error) {
              toaster.error(toUserMessage(error));
              input.focus();
            }
          });
        },
      },
      h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'Numele tău de utilizator'), h('span', { class: 'field__prefix-wrap' }, h('span', { class: 'field__prefix', 'aria-hidden': 'true' }, '@'), input), hint),
      submit,
    );

    return h(
      'section',
      { class: 'narrow onboarding' },
      avatar({ photoURL: authUser.photoURL, displayName: authUser.displayName }, { size: 'xl' }),
      h('h1', { class: 'display' }, `Bun venit, ${(authUser.displayName || '').split(' ')[0] || 'dragă'}`),
      h('p', { class: 'lede' }, 'Alege-ți un nume de utilizator. Partenerul tău te va căuta după el ca să vă conectați.'),
      form,
      h('button', { class: 'link-button', type: 'button', onclick: () => this.ctx.authService.signOut() }, icon('logout', { size: 18 }), 'Alt cont Google'),
    );
  }
}
