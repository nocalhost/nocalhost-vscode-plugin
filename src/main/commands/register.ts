import * as vscode from "vscode";
import state from "../state";
import host from "../host";
import logger from "../utils/logger";

export default function registerCommand(
  context: vscode.ExtensionContext,
  command: string,
  isLock: boolean,
  callback: any
) {
  logger.info(`[vscode Command] register command: ${command}`);
  const dispose = vscode.commands.registerCommand(
    command,
    async (...args: any[]) => {
      host.check();
      logger.info(`[vscode Command] exec command: ${command}`);
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
