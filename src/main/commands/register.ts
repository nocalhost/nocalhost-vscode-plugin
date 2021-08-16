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
      logger.info(`[vscode Command] exec command: ${command}`);
      if (isLock) {
        if (state.isRunning()) {
          host.showWarnMessage("Failed to get node configs, please try again.");
          return;
        }
        state.setRunning(true);
      }

      if (callback.then) {
        await callback(...args)
          .catch((err: any) => {
            const errMessage = err.message ? err.message : err;
            host.showErrorMessage(errMessage);
            logger.error(
              `[vscode Command] exec command: ${command}. ${errMessage}`
            );
          })
          .finally(() => {
            if (isLock) {
              state.setRunning(false);
            }
          });
      } else {
        try {
          callback(...args);
        } catch (error) {
          host.showErrorMessage(error.message);
          logger.error(
            `[vscode Command] exec command: ${command}. ${
              error && error.message
            }: ${error && error.stack}`
          );
        } finally {
          if (isLock) {
            state.setRunning(false);
          }
        }
      }
    }
  );

  context.subscriptions.push(dispose);
}
