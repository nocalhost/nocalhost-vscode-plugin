import * as vscode from "vscode";
import * as shell from "../../../ctl/shell";
import { IMessage } from "..";
import fetchLogs from "./fetchLogs";

export async function ctlFetch(command: string): Promise<string> {
  let result: string = "";
  const shellObj = await shell.execAsync(command, []);
  if (shellObj.code === 0) {
    result = shellObj.stdout;
  } else {
    result = shellObj.stderr;
  }
  return result;
}

export default function (message: IMessage) {
  const { type } = message;
  switch (type) {
    case "executeCommand": {
      vscode.commands.executeCommand(message.payload?.command);
      break;
    }
    case "logs/fetch": {
      fetchLogs(message);
      break;
    }
    default:
      break;
  }
}
