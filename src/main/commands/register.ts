import * as vscode from "vscode";
import state from "../state";
import host from "../host";

export default function registerCommand(
  context: vscode.ExtensionContext,
  command: string,
  isLock: boolean,
  callback: any
) {
  const dispose = vscode.commands.registerCommand(
    command,
    async (...args: any[]) => {
      if (isLock) {
        if (state.isRunning()) {
          host.showWarnMessage("A task is running, please try again later");
          return;
        }
        state.setRunning(true);
        Promise.resolve(callback(...args))
          .catch((err) => {
            const errMessage = err.message ? err.message : err;
            host.showErrorMessage(errMessage);
          })
          .finally(() => {
            state.setRunning(false);
          });
      } else {
        if (callback.then) {
          callback(...args).catch((err: any) => {
            const errMessage = err.message ? err.message : err;
            host.showErrorMessage(errMessage);
          });
        } else {
          callback(...args);
        }
      }
    }
  );

  context.subscriptions.push(dispose);
}
