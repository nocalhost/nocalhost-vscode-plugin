import * as vscode from "vscode";
import NocalhostAppProvider from "../appProvider";
import AssociateLocalDirxectoryCommand from "./AssociateDirectoryCommand";
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
import ResetDevspaceCommand from "./ResetDevspaceCommand";
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
import SyncServiceCommand from "./SyncServiceCommand";
import OverrideSyncCommand from "./OverrideSyncCommand";
import PortForwardListCommand from "./PortForwardListCommand";
import CopyTerminalCommand from "./CopyTerminalCommand";
import UpgradeCommand from "./UpgradeCommand";
import EditAppConfigCommand from "./EditAppConfigCommand";
import ShowApplicationsCommand from "./ShowApplicationsCommand";
import ReconnectSyncCommand from "./ReconnectSyncCommand";
import DebugCommand from "./DebugCommand";
import RunCommand from "./RunCommand";
import DeleteKubeConfigCommand from "./DeleteKubeConfigCommand";
import AddKubeconfig from "./AddKubeconfigCommand";
import ClustersViewCommand from "./ClustersViewCommand";
import ClearLocalCluster from "./ClearLocalCluster";
import ClearServerCluster from "./ClearServerCluster";

import ShowClusterInfoCommand from "./ShowClusterInfoCommand";
export default function initCommands(
  context: vscode.ExtensionContext,
  appTreeProvider: NocalhostAppProvider
) {
  new ShowClusterInfoCommand(context);
  new ClearLocalCluster(context);
  new ClustersViewCommand(context);
  new EditServiceConfigCommand(context);
  new WriteServiceConfigCommand(context);

  new StartDevModeCommand(context);
  new EndDevModeCommand(context);

  new SwitchEndPointCommand(context);
  new OpenEndPointCommand(context);

  new SignInCommand(context, appTreeProvider);
  new SignOutCommand(context);

  new RefreshCommand(context, appTreeProvider);
  new InstallCommand(context);
  new UninstallCommand(context);
  new LoadResourceCommand(context);
  new LogCommand(context);
  new PortForwardCommand(context);
  new PortForwardListCommand(context);
  new ExecCommand(context);
  new CopyTerminalCommand(context);
  new ResetCommand(context);
  new CleanPvcCommand(context);
  new ResetDevspaceCommand(context);
  new LoadWorkloadsCommand(context);
  new ViewKubeConfigCommand(context);
  new AssociateLocalDirxectoryCommand(context);

  new ApplyKubernetesObjectCommand(context);
  new DeleteKubernetesObjectCommand(context);
  new SyncServiceCommand(context);
  new OverrideSyncCommand(context);
  new UpgradeCommand(context);
  new EditAppConfigCommand(context);
  new ShowApplicationsCommand(context);
  new ReconnectSyncCommand(context);

  // command
  new DebugCommand(context);
  new RunCommand(context);

  new DeleteKubeConfigCommand(context);
  new AddKubeconfig(context);
  new ClearServerCluster(context);
}
