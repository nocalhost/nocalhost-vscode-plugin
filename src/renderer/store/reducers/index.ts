import { IStoreState } from "../store.types";
import { Actions, ActionType, IRedirect } from "../actions/actions.types";
import { redirect } from "./redirect";

const reducer = (state: IStoreState, action: Actions) => {
  switch (action.type) {
    case ActionType.Redirect:
      return redirect(state, action as IRedirect);
    default:
      return state;
  }
};

export default reducer;
