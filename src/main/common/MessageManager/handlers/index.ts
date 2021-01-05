import * as vscode from "vscode";
import { IMessage } from "..";
import fetchLogs from "./fetchLogs";
import fetchDeployments from "./fetchDeployments";

export default function (message: IMessage) {
  const { type } = message;
  switch (type) {
    case "executeCommand":
      return vscode.commands.executeCommand(message.payload?.command);
    case "logs/fetch":
      return fetchLogs(message);
    case "deployments/fetch":
      return fetchDeployments(message);
    default:
      return;
  }
}
