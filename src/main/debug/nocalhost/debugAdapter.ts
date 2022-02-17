import vscode from "vscode";
import { startDebug } from "./start";

export class NocalhostDebugAdapterDescriptorFactory
  implements vscode.DebugAdapterDescriptorFactory
{
  public async createDebugAdapterDescriptor(
    session: vscode.DebugSession,
    _executable: vscode.DebugAdapterExecutable
  ): Promise<vscode.DebugAdapterDescriptor | undefined> {
    return new vscode.DebugAdapterInlineImplementation(
      new NocalhostDebugAdapter(session.configuration)
    );
  }
}

interface DebugProtocolMessage {}

class NocalhostDebugAdapter implements vscode.DebugAdapter {
  constructor(configuration: vscode.DebugConfiguration) {
    setTimeout(async () => {
      await vscode.debug.stopDebugging(vscode.debug.activeDebugSession);
      startDebug(configuration);
    }, 0);
  }
  private _sendMessage = new vscode.EventEmitter<DebugProtocolMessage>();
  onDidSendMessage = this._sendMessage.event;
  handleMessage(_message: vscode.DebugProtocolMessage): void {}
  dispose() {
    this._sendMessage.dispose();
  }
}
