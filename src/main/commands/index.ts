import * as vscode from "vscode";
import NocalhostAppProvider from "../appProvider";
import AssociateLocalDirectoryCommand from "./AssociateDirectoryCommand";
import CleanPvcCommand from "./CleanPvcCommand";
import EditServiceConfigCommand from "./EditServiceConfigCommand";
import EndDevModeCommand from "./EndDevModeCommand";
import ExecCommand from "./ExecCommand";
import RefreshCommand from "./FreshCommand";
import InstallCommand from "./InstallCommand";
import LoadResourceCommand from "./LoadResourceCommand";
import LogCommand from "./LogCommand";
import OpenEndPointCommand from "./OpenEndPointCommand";
import PortForwardCommand from "./PortForwardCommand";
import ResetAppCommand from "./ResetAppCommand";
import ResetCommand from "./ResetCommand";
import SignInCommand from "./SignInCommand";
import SignOutCommand from "./SignOutCommand";
import StartDevModeCommand from "./StartDevModeCommand";
import SwitchEndPointCommand from "./SwitchEndPointCommand";
import UninstallCommand from "./UninstallCommand";
import ViewKubeConfigCommand from "./ViewKubeConfig";
import WriteServiceConfigCommand from "./WriteServiceConfigCommand";
import LoadWorkloadsCommand from "./LoadWorkloadsCommand";
import ApplyKubernetesObjectCommand from "./ApplyKubernetesObjectCommand";
import DeleteKubernetesObjectCommand from "./DeleteKubernetesObjectCommand";

export default function initCommands(
  context: vscode.ExtensionContext,
  appTreeProvider: NocalhostAppProvider
) {
  new EditServiceConfigCommand(context);
  new WriteServiceConfigCommand(context);

  new StartDevModeCommand(context);
  new EndDevModeCommand(context);

  new SwitchEndPointCommand(context);
  new OpenEndPointCommand(context);

  new SignInCommand(context);
  new SignOutCommand(context);

  new RefreshCommand(context, appTreeProvider);
  new InstallCommand(context);
  new UninstallCommand(context);
  new LoadResourceCommand(context);
  new LogCommand(context);
  new PortForwardCommand(context);
  new ExecCommand(context);
  new ResetCommand(context);
  new CleanPvcCommand(context);
  new ResetAppCommand(context);
  new LoadWorkloadsCommand(context);
  new ViewKubeConfigCommand(context);
  new AssociateLocalDirectoryCommand(context);

  new ApplyKubernetesObjectCommand(context);
  new DeleteKubernetesObjectCommand(context);
}
