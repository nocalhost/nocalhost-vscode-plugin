import * as vscode from "vscode";
import { IMessage } from "./MessageManager";

export default function (event: IMessage) {
  const { type } = event;
  switch (type) {
    case "executeCommand": {
      vscode.commands.executeCommand(event.payload?.command);
      break;
    }
    default:
      break;
  }
}
