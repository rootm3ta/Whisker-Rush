type Handler<T> = (payload: T) => void;

/** Typed pub/sub. Gameplay emits; missions, audio, haptics, analytics subscribe. */
export class EventBus<E extends object> {
  private readonly handlers = new Map<keyof E, Handler<never>[]>();

  on<K extends keyof E>(name: K, fn: Handler<E[K]>): () => void {
    let list = this.handlers.get(name);
    if (!list) this.handlers.set(name, (list = []));
    list.push(fn as Handler<never>);
    return () => this.off(name, fn);
  }

  off<K extends keyof E>(name: K, fn: Handler<E[K]>): void {
    const list = this.handlers.get(name);
    if (!list) return;
    const i = list.indexOf(fn as Handler<never>);
    if (i >= 0) list.splice(i, 1);
  }

  emit<K extends keyof E>(name: K, payload: E[K]): void {
    const list = this.handlers.get(name) as Handler<E[K]>[] | undefined;
    if (!list) return;
    for (let i = 0; i < list.length; i++) list[i](payload);
  }
}
