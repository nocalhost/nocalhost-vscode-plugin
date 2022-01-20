import { IMessage } from "..";
import NocalhostWebviewPanel from "../../../webview/NocalhostWebviewPanel";

export default async function updateURL(message: IMessage, id: number) {
  const { payload } = message;
  const panel: NocalhostWebviewPanel = NocalhostWebviewPanel.getPanelById(id);

  if (!payload || !payload.url || !panel) {
    return;
  }
  panel.setURL(payload.url);
}
