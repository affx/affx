export class SimpleStore<T> {
  private state: Map<symbol, T> = new Map();

  public constructor(private ctor: { new (): T }) {}

  public get(id: symbol): T {
    const element = this.state.get(id);

    if (element) {
      return element;
    }

    return this.state.set(id, new this.ctor()).get(id)!;
  }
}
