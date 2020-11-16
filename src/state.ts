class State {
  private login = false;

  public isLogin() {
    return this.login;
  }

  setLogin(state: boolean) {
    this.login = state;
  }
}

export default new State();