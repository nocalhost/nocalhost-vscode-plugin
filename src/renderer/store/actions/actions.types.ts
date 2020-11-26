export enum ActionType {
  Redirect = "redirect",
}

export interface IRedirect {
  type: ActionType.Redirect;
  payload: { uri: string };
}

export type Actions = IRedirect;
