import { ActionType, IRedirect, IToggleTheme } from "./actions.types";

export const redirect = (url: string): IRedirect => ({
  type: ActionType.redirect,
  payload: { url },
});

export const toggleTheme = (theme: string): IToggleTheme => ({
  type: ActionType.toggleTheme,
  payload: { theme },
});
