class InitializationManager {
  private initPromises: Map<string, Promise<void>> = new Map();

  async initialize(name: string, initFn: () => Promise<void>, deps: string[] = []) {
    if (this.initPromises.has(name)) return this.initPromises.get(name);

    const promise = (async () => {
      await Promise.all(deps.map(dep => this.initialize(dep, () => Promise.resolve())));
      await initFn();
    })();

    this.initPromises.set(name, promise);
    return promise;
  }
}

export const initManager = new InitializationManager();
