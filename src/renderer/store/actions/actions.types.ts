import { IDeployments, ILogs } from "../store.types";

export enum ActionType {
  redirect = "redirect",
  toggleTheme = "theme/toggle",
  updateLogs = "logs/update",
  updateDeployments = "deployments/update",
}

export interface IRedirect {
  type: ActionType.redirect;
  payload: { url: string };
}

export interface IToggleTheme {
  type: ActionType.toggleTheme;
  payload: { theme: string };
}

export interface IUpdateLogs {
  type: ActionType.updateLogs;
  payload: { logs: ILogs };
}

export interface IUpdateDeployments {
  type: ActionType.updateDeployments;
  payload: { deployments: IDeployments };
}

export type Actions =
  | IRedirect
  | IToggleTheme
  | IUpdateLogs
  | IUpdateDeployments;
