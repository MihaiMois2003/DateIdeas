/**
 * Router simplu pe hash (#/ideas, #/idea/abc).
 * Fiecare rută primește o fabrică ce construiește o View (Open/Closed:
 * adaugi ecrane noi fără să modifici routerul).
 */
export class Router {
  #routes = [];
  #current = null;
  #outlet;
  #guard;
  #fallback;
  #onChange;

  constructor({ outlet, guard, fallback, onChange = () => {} }) {
    this.#outlet = outlet;
    this.#guard = guard;
    this.#fallback = fallback;
    this.#onChange = onChange;
  }

  add(pattern, factory) {
    const keys = [];
    const regex = new RegExp(
      '^' + pattern.replace(/:(\w+)/g, (_, key) => (keys.push(key), '([^/]+)')) + '/?$',
    );
    this.#routes.push({ regex, keys, factory });
    return this;
  }

  start() {
    window.addEventListener('hashchange', () => this.resolve());
    this.resolve();
  }

  get path() {
    return location.hash.slice(1) || '/';
  }

  navigate(path) {
    if (this.path === path) this.resolve();
    else location.hash = path;
  }

  resolve() {
    const [path, search = ''] = this.path.split('?');
    const decision = this.#guard(path);

    if (decision?.redirect && decision.redirect !== path) {
      history.replaceState(null, '', '#' + decision.redirect);
      return this.resolve();
    }

    const view = decision?.view ?? this.#match(path, new URLSearchParams(search)) ?? this.#fallback();
    this.#mount(view);
  }

  #match(path, query) {
    for (const route of this.#routes) {
      const found = path.match(route.regex);
      if (!found) continue;
      const params = Object.fromEntries(route.keys.map((key, i) => [key, decodeURIComponent(found[i + 1])]));
      return route.factory({ ...params, query });
    }
    return null;
  }

  #mount(view) {
    this.#current?.destroy?.();
    this.#current = view;
    this.#outlet.replaceChildren(view.render());
    this.#outlet.scrollTop = 0;
    window.scrollTo(0, 0);
    view.mounted?.();
    this.#onChange(this.path);
  }
}
