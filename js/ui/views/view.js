/**
 * Clasa de bază a ecranelor. Fiecare ecran își înregistrează abonamentele cu track(),
 * iar routerul apelează destroy() la plecare, deci nu rămân ascultători agățați.
 */
export class View {
  #cleanups = [];

  constructor(ctx) {
    this.ctx = ctx;
  }

  track(cleanup) {
    this.#cleanups.push(cleanup);
    return cleanup;
  }

  listen(event, handler) {
    return this.track(this.ctx.bus.on(event, handler));
  }

  render() {
    throw new Error(`${this.constructor.name}.render() nu e implementat`);
  }

  destroy() {
    this.#cleanups.splice(0).forEach((cleanup) => {
      try {
        cleanup();
      } catch (error) {
        console.warn(error);
      }
    });
  }
}
