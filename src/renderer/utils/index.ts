interface State {
  [key: string]: unknown;
}

// @ts-ignore
const vscode = acquireVsCodeApi() as {
  getState(): State;
  setState(data: State): void;
  postMessage: (msg: unknown) => void;
};

export const postMessage = vscode.postMessage;

let state: State;

export const getState = <T = unknown>(key: string): T => {
  if (!state) {
    state = vscode.getState() || {};
  }

  return state[key] as T;
};

export const setState = (arg: string | State, value?: unknown) => {
  let list: State;

  if (typeof arg === "string") {
    list = { [arg]: value };
  } else {
    list = arg;
  }

  state = { ...state, ...list };

  vscode.setState(state);
};

export default {
  setState,
  postMessage,
  getState,
};
