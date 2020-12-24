export enum ActionType {
  redirect = "redirect",
  toggleTheme = "theme/toggle",
}

export interface IRedirect {
  type: ActionType.redirect;
  payload: { url: string };
}

export interface IToggleTheme {
  type: ActionType.toggleTheme;
  payload: { theme: string };
}

export type Actions = IRedirect | IToggleTheme;
