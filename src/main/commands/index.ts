import * as vscode from "vscode";
import NocalhostAppProvider from "../appProvider";
import AssociateDirectoryCommand from "./AssociateDirectoryCommand";
import CleanPvcCommand from "./CleanPvcCommand";
import EditServiceConfigCommand from "./EditServiceConfigCommand";
import EndDevModeCommand from "./EndDevModeCommand";
import ExecCommand from "./ExecCommand";
import RefreshCommand, { RefreshingCommand } from "./RefreshCommand";
import InstallCommand from "./InstallCommand";
import LogCommand from "./LogCommand";
import OpenEndPointCommand from "./OpenEndPointCommand";
import ResetDevspaceCommand from "./ResetDevspaceCommand";
import ResetCommand from "./ResetCommand";
import SignInCommand from "./SignInCommand";
import SignOutCommand from "./SignOutCommand";
import StartDevModeCommand from "./StartDevModeCommand";
import SwitchEndPointCommand from "./SwitchEndPointCommand";
import UninstallCommand from "./UninstallCommand";
import ViewKubeConfigCommand from "./ViewKubeConfig";
import ApplyKubernetesObjectCommand from "./ApplyKubernetesObjectCommand";
import DeleteKubernetesObjectCommand from "./DeleteKubernetesObjectCommand";
import SyncServiceCommand from "./sync/SyncServiceCommand";
import OverrideSyncCommand from "./sync/OverrideSyncCommand";
import OpenSyncCommand from "./sync/OpenSyncCommand";
import OpenSyncDashboardCommand from "./sync/OpenSyncDashboardCommand";
import CopyTerminalCommand from "./CopyTerminalCommand";
import UpgradeCommand from "./UpgradeCommand";
import ShowApplicationsCommand from "./ShowApplicationsCommand";
import ReconnectSyncCommand from "./sync/ReconnectSyncCommand";
import DebugCommand from "./DebugCommand";
import RunCommand from "./RunCommand";
import DeleteKubeConfigCommand from "./DeleteKubeConfigCommand";
import AddKubeconfig from "./AddKubeconfigCommand";
import ClustersViewCommand from "./ClustersViewCommand";
import ClearLocalCluster from "./ClearLocalCluster";
import ClearServerCluster from "./ClearServerCluster";
import InstallAppSourceCommand from "./InstallAppSourceCommand";
import ShowClusterInfoCommand from "./ShowClusterInfoCommand";
import RenameCommand from "./RenameCommand";
import OpenProjectCommand from "./OpenProjectCommand";
import EditManifestCommand from "./EditManifestCommand";
import ResetPluginCommand from "./ResetPluginCommand";
import StartCopyDevModeCommand from "./StartCopyDevModeCommand";
import LocateWorkNodeCommand from "./LocateWorkNodeCommand";
import PortForwardCommand from "./PortForwardCommand/";
import StartProxyModeCommand from "./proxy/StartProxyModeCommand";
import ResumeProxyModeCommand from "./proxy/ResumeProxyModeCommand";
import EndProxyModeCommand from "./proxy/EndProxyModeCommand";
import HomeWebViewCommand from "./HomeWebViewCommand";
import StartMeshDevModeCommand from "./StartMeshDevModeCommand";

export default function initCommands(
  context: vscode.ExtensionContext,
  appTreeProvider: NocalhostAppProvider
) {
  new RenameCommand(context);
  new ShowClusterInfoCommand(context);
  new ClearLocalCluster(context);
  new ClustersViewCommand(context);
  new EditServiceConfigCommand(context);

  new StartDevModeCommand(context);
  new EndDevModeCommand(context);

  new SwitchEndPointCommand(context);
  new OpenEndPointCommand(context);

  new SignInCommand(context, appTreeProvider);
  new SignOutCommand(context);

  new RefreshCommand(context, appTreeProvider);
  new RefreshingCommand(context);

  new InstallCommand(context);
  new UninstallCommand(context);
  new EditManifestCommand(context);
  new LogCommand(context);
  new PortForwardCommand(context);
  new ExecCommand(context);
  new CopyTerminalCommand(context);
  new ResetCommand(context);
  new CleanPvcCommand(context);
  new ResetDevspaceCommand(context);
  new ViewKubeConfigCommand(context);
  new AssociateDirectoryCommand(context);

  new ApplyKubernetesObjectCommand(context);
  new DeleteKubernetesObjectCommand(context);
  new SyncServiceCommand(context);
  new OverrideSyncCommand(context);
  new OpenSyncCommand(context);
  new OpenSyncDashboardCommand(context);

  new UpgradeCommand(context);
  new ShowApplicationsCommand(context);
  new ReconnectSyncCommand(context);

  // command
  new DebugCommand(context);
  new RunCommand(context);
  new OpenProjectCommand(context);

  new DeleteKubeConfigCommand(context);
  new AddKubeconfig(context);
  new LocateWorkNodeCommand(context, appTreeProvider);
  new ClearServerCluster(context);
  new InstallAppSourceCommand(context);

  new ResetPluginCommand(context);
  new StartCopyDevModeCommand(context);
  new StartMeshDevModeCommand(context);

  new StartProxyModeCommand(context);
  new ResumeProxyModeCommand(context);
  new EndProxyModeCommand(context);

  new HomeWebViewCommand(context);
}
