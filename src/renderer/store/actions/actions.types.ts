export enum ActionType {
  redirect = "redirect",
}

export interface IRedirect {
  type: ActionType.redirect;
  payload: { uri: string };
}

export type Actions = IRedirect;
