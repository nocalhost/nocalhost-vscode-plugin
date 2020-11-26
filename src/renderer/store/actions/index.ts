import { ActionType, IRedirect } from "./actions.types";

export const redirect = (uri: string): IRedirect => ({
  type: ActionType.redirect,
  payload: { uri },
});
