interface VSCodeState {
  [key: string]: any;
}
// @ts-ignore
export const vscode = acquireVsCodeApi() as {
  getState: () => VSCodeState;
  setState: (data: VSCodeState) => void;
  postMessage: (data: any) => void;
};

export const postMessage = vscode.postMessage;
