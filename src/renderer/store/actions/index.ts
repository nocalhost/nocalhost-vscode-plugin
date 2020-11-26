import { ActionType, IRedirect } from "./actions.types";

export const Redirect = (uri: string): IRedirect => ({
  type: ActionType.redirect,
  payload: { uri },
});
