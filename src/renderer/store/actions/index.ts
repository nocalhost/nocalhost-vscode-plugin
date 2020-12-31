import { ILogs } from "../store.types";
import {
  ActionType,
  IRedirect,
  IToggleTheme,
  IUpdateLogs,
} from "./actions.types";

export const redirect = (url: string): IRedirect => ({
  type: ActionType.redirect,
  payload: { url },
});

export const toggleTheme = (theme: string): IToggleTheme => ({
  type: ActionType.toggleTheme,
  payload: { theme },
});

export const updateLogs = (logs: ILogs): IUpdateLogs => ({
  type: ActionType.updateLogs,
  payload: { logs },
});
