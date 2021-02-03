import React, { createContext, useReducer } from "react";
import { IStoreState, IAppContext } from "./store.types";
import reducer from "./reducers";
import { ThemeType } from "../constants";

const initialState: IStoreState = {
  url: "/landing",
  theme: ThemeType.dark,
  logs: {
    id: "",
    items: null,
  },
  deployments: {
    id: "",
    items: [],
  },
};

const store = createContext<IAppContext>({
  state: initialState,
  dispatch: () => null,
});

const { Provider } = store;

const AppProvider = ({ children }: { children: JSX.Element }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <Provider value={{ state, dispatch }}>{children}</Provider>;
};

export { store, AppProvider };
