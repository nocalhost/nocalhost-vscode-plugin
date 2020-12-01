import * as vscode from "vscode";

class State {
  private login = false;

  private stateMap = new Map<string, any>();

  private running = false;

  public isLogin() {
    return this.login;
  }

  public isRunning() {
    return this.running;
  }

  async setLogin(state: boolean) {
    await vscode.commands.executeCommand("setContext", "login", state);
    await vscode.commands.executeCommand("Nocalhost.refresh");
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
    vscode.commands.executeCommand("Nocalhost.refresh");
  }

  set(key: string, value: any) {
    this.stateMap.set(key, value);
    vscode.commands.executeCommand("Nocalhost.refresh");
  }
}

export default new State();
