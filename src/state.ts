class State {
  private login = true;

  private stateMap = new Map<string, any>();

  private running = false;

  public isLogin() {
    return this.login;
  }

  public isRunning() {
    return this.running;
  }

  setLogin(state: boolean) {
    this.login = state;
  }

  setRunning(running: boolean) {
    this.running = running;
  }

  get(key: string) {
    return this.stateMap.get(key);
  }

  delete(key: string) {
    this.stateMap.delete(key);
  }

  set(key: string, value: any) {
    this.stateMap.set(key, value);
  }
}

export default new State();