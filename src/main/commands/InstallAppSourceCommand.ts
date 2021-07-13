import { KubeConfigNode } from "./../nodes/KubeConfigNode";
import { NhctlCommand } from "./../ctl/nhctl";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import {
  execAsyncWithReturn,
  execChildProcessAsync,
  ShellResult,
} from "../ctl/shell";
import * as tempy from "tempy";

import { DevSpaceNode } from "../nodes/DevSpaceNode";
import { replaceSpacePath, readYamlSync } from "../utils/fileUtil";
import git from "../ctl/git";
import ICommand from "./ICommand";
import { INSTALL_APP_SOURCE } from "./constants";
import registerCommand from "./register";
import host, { Host } from "../host";
import { getFilesByDir, readYaml } from "../utils/fileUtil";
import * as nhctl from "../ctl/nhctl";
import { AppNode } from "../nodes/AppNode";
import { INocalhostConfig } from "../domain";
import { AppType } from "../domain/define";

async function getKustomizeYamlPath(): Promise<string> {
  const res = await host.showInformationMessage(
    " Do you want to specify a Kustomize path ?",
    { modal: true },
    "Use Default",
    "Specify One"
  );
  if (!res) {
    return;
  }
  let kustomizeYamlPath = null;
  if (res === "Specify One") {
    kustomizeYamlPath = await host.showInputBox({
      placeHolder: "please input your kustomize path",
    });
  }
  return kustomizeYamlPath;
}
async function getHelmValues(): Promise<[string?, string?]> {
  const res = await host.showInformationMessage(
    "Do you want to specify values?",
    { modal: true },
    "Use Default values",
    "Specify One values.yaml",
    "Specify values"
  );
  if (!res) {
    return [];
  }
  let values = null,
    valuesStr = null;
  if (res === "Specify One values.yaml") {
    const valuesUri = await host.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      title: "Select the value file path",
    });
    if (!valuesUri || valuesUri.length === 0) {
      return [];
    }
    values = valuesUri[0].fsPath;
  } else if (res === "Specify values") {
    valuesStr = await host.showInputBox({
      placeHolder: "eg: key1=val1,key2=val2",
    });

    if (!valuesStr) {
      return [];
    }
  }
  return [values, valuesStr];
}

async function installRawManifastLocal(props: {
  appName: string;
  installType: string;
  kubeConfigPath: string;
  resourcePath: string[];
  gitRef?: string;
  gitUrl?: string;
  localPath?: string;
  namespace: string;
  configPath: string;
}) {
  const {
    appName,
    gitRef,
    gitUrl,
    kubeConfigPath,
    localPath,
    installType,
    configPath,
    resourcePath,
    namespace,
  } = props;
  const installCommand = await NhctlCommand.install({
    kubeConfigPath,
    namespace,
  })
    .addArgument(appName)
    .addArgumentStrict("-t", installType)
    .addArgumentStrict("--resource-path", resourcePath)
    .addArgumentStrict("--git-ref", gitRef)
    .addArgumentStrict("--git-url", gitUrl)
    .addArgumentStrict("--local-path", localPath)
    .addArgumentStrict(`--config`, configPath)
    .getCommand();
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Installing application: ${appName}`,
      cancellable: false,
    },
    () => {
      return execChildProcessAsync(host, installCommand, [], {
        dialog: `Install application (${appName}) fail`,
      });
    }
  );
}

async function installHelmRep(props: {
  appName: string;
  kubeConfigPath: string;
  namespace: string;
  helmRepoUrl?: string;
  chartName?: string;
  helmRepoVersion: string;
  resourcePath?: string[];
  installType: string;
}) {
  const [values, valuesStr] = await getHelmValues();
  await installApp({
    ...props,
    values,
    valuesStr,
  });
}

async function installApp(props: {
  appName: string;
  kubeConfigPath: string;
  namespace: string;
  localPath?: string;
  gitUrl?: string;
  chartName?: string;
  gitRef?: string;
  values?: string;
  helmRepoVersion?: string;
  helmRepoUrl?: string;
  valuesStr?: string;
  resourcePath?: string[];
  installType: string;
  configPath?: string;
}) {
  const {
    appName,
    localPath,
    gitUrl,
    helmRepoUrl,
    gitRef,
    installType,
    values,
    helmRepoVersion,
    chartName,
    resourcePath,
    valuesStr,
    configPath,
    kubeConfigPath,
    namespace,
  } = props;
  host.log(`Installing application: ${appName}`, true);
  const installCommand = NhctlCommand.install({
    kubeConfigPath,
    namespace,
  })
    .addArgument(appName)
    .addArgumentStrict("-t", installType)
    .addArgumentStrict("-f", values)
    .addArgumentStrict("--helm-chart-name", chartName)
    .addArgumentStrict(" --helm-repo-url ", helmRepoUrl)
    .addArgumentStrict("--resource-path", resourcePath)
    .addArgumentStrict("--set", valuesStr)
    .addArgumentStrict("--helm-repo-version", helmRepoVersion)
    .addArgumentStrict("--git-ref", gitRef)
    .addArgumentStrict("--git-url", gitUrl)
    .addArgumentStrict("--local-path", localPath)
    .addArgumentStrict(`--config`, configPath)
    .getCommand();
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Installing application: ${appName}`,
      cancellable: false,
    },
    () => {
      return execChildProcessAsync(host, installCommand, [], {
        dialog: `Install application (${appName}) fail`,
      });
    }
  );
}
async function installHelmApp(props: {
  appName: string;
  kubeConfigPath: string;
  namespace: string;
  localPath?: string;
  gitUrl?: string;
  gitRef?: string;
  resourcePath?: string[];
  installType: string;
  configPath: string;
}) {
  const [values, valuesStr] = await getHelmValues();
  await installApp({ ...props, values, valuesStr });
}

async function installKustomizeApp(props: {
  appName: string;
  kubeConfigPath: string;
  namespace: string;
  gitUrl?: string;
  installType: string;
  gitRef?: string;
  resourcePath?: string[];
}) {
  const configPath = await getKustomizeYamlPath();
  await installApp({
    ...props,
    configPath,
  });
}

async function getNocalhostConfig(dir: string) {
  const dirPath = path.resolve(dir, ".nocalhost");
  let fileNames = getFilesByDir(dirPath);
  fileNames = (fileNames || [])
    .filter((fileName) => {
      const extname = path.extname(fileName);
      return [".yaml", ".yml"].includes(extname);
    })
    .filter((fileName) => {
      return Boolean(readYamlSync(path.resolve(dirPath, fileName)));
    });
  if (fileNames.length === 0) {
    vscode.window.showWarningMessage(
      "No config.yaml available for this directory"
    );
    return;
  }
  let configFileName = fileNames[0];
  if (fileNames.length > 1) {
    const selectedFileName = await vscode.window.showQuickPick(fileNames);
    if (!selectedFileName) {
      return;
    }
    configFileName = selectedFileName;
  }
  return configFileName;
}

async function parseNocalhostConfig(
  configPath: string
): Promise<INocalhostConfig | null> {
  if (!configPath) {
    return;
  }
  const config: INocalhostConfig = await readYaml(configPath);
  if (!config) {
    vscode.window.showErrorMessage(`Unresolved: ${configPath}`);
    return;
  }
  const appName = config?.application?.name;
  if (!config?.application?.manifestType) {
    vscode.window.showErrorMessage(
      `Missing application.manifestType parameter`
    );
    return;
  }
  if (!appName) {
    vscode.window.showErrorMessage(`Missing application.name parameter`);
    return;
  }
  return config;
}

export default class InstallAppSourceCommand implements ICommand {
  command: string = INSTALL_APP_SOURCE;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, true, this.execCommand.bind(this));
  }
  async execCommand(appNode: DevSpaceNode) {
    if (!appNode) {
      host.showWarnMessage("A task is running, please try again later");
      return;
    }

    const LOCAL = "Open local directory";
    const CLONE_GIT = "Clone from Git";
    const HELM_REPO = "Helm Repo";

    const res = await host.showInformationMessage(
      "Please select the application installation source",
      { modal: true },
      LOCAL,
      CLONE_GIT,
      HELM_REPO
    );

    if (res === LOCAL) {
      const uris = await host.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
      });
      if (!uris || uris.length === 0) {
        return;
      }
      const dir = uris[0].fsPath;
      const dirPath = path.resolve(dir, ".nocalhost");
      const configFileName = await getNocalhostConfig(dir);
      if (!configFileName) {
        return;
      }
      const configPath = path.resolve(dirPath, configFileName);
      const nocalhostConfig = await parseNocalhostConfig(configPath);
      if (!nocalhostConfig) {
        return;
      }
      const manifestType = nocalhostConfig?.application?.manifestType;
      const appName = nocalhostConfig?.application?.name;
      if (
        [
          AppType.helmLocal,
          AppType.kustomizeLocal,
          AppType.rawManifestLocal,
        ].indexOf(manifestType) === -1
      ) {
        vscode.window.showErrorMessage(
          `Please choose another installation method`
        );
        return;
      }

      if (manifestType === AppType.helmLocal) {
        await installHelmApp({
          kubeConfigPath: appNode.getKubeConfigPath(),
          namespace: appNode?.info?.namespace,
          localPath: dir,
          configPath,
          resourcePath: nocalhostConfig?.application?.resourcePath,
          installType: manifestType,
          appName,
        });
      }
      if (manifestType === AppType.kustomizeLocal) {
        await installKustomizeApp({
          kubeConfigPath: appNode.getKubeConfigPath(),
          namespace: appNode?.info?.namespace,
          appName,
          resourcePath: nocalhostConfig?.application?.resourcePath,
          installType: manifestType,
        });
      }

      if (manifestType === AppType.rawManifestLocal) {
        await installRawManifastLocal({
          kubeConfigPath: appNode.getKubeConfigPath(),
          namespace: appNode?.info?.namespace,
          localPath: dir,
          resourcePath: nocalhostConfig?.application?.resourcePath,
          installType: manifestType,
          configPath,
          appName,
        });
      }
    }

    if (res === HELM_REPO) {
      const helmRepoUrl = await host.showInputBox({
        placeHolder: "please input your helm chart",
      });
      if (!helmRepoUrl) {
        return;
      }
      const appName = await host.showInputBox({
        placeHolder: "please input application name",
      });
      if (!appName) {
        return;
      }
      const res = await host.showInformationMessage(
        "Which version to install?",
        { modal: true },
        "Default Version",
        "Specify One"
      );
      let helmRepoVersion = null;
      if (res === "Specify One") {
        helmRepoVersion = await host.showInputBox({
          placeHolder: "please input the version of chart",
        });
        if (!helmRepoVersion) {
          return;
        }
      }

      await installHelmRep({
        kubeConfigPath: appNode.getKubeConfigPath(),
        namespace: appNode?.info?.namespace,
        helmRepoUrl,
        helmRepoVersion,
        chartName: appName,
        installType: AppType.helmRepo,
        appName,
      });
    }

    if (res === CLONE_GIT) {
      const gitUrl = await host.showInputBox({
        placeHolder: "please input your git url",
      });
      if (!gitUrl) {
        return;
      }
      let gitRef = null;
      const r = await host.showInformationMessage(
        "Which branch to install(Manifests in Git Repo)?",
        { modal: true },
        "Default Branch",
        "Specify one"
      );
      if (!r) {
        return;
      }

      if (r === "Specify one") {
        let msg = "please input the branch of repository";
        gitRef = await host.showInputBox({
          placeHolder: msg,
        });

        if (!gitRef) {
          return;
        }
      }
      const savePath = tempy.directory();
      const args = [replaceSpacePath(savePath) as string];
      if (gitRef) {
        args.push("-b");
        args.push(gitRef);
      }
      await git.clone(host, gitUrl as string, args);
      host.log("git clone finish", true);

      const configFileName = await getNocalhostConfig(savePath);
      if (!configFileName) {
        return;
      }
      const dirPath = path.resolve(savePath, ".nocalhost");
      const configPath = path.resolve(dirPath, configFileName);
      const nocalhostConfig = await parseNocalhostConfig(configPath);
      if (!nocalhostConfig) {
        return;
      }
      const manifestType = nocalhostConfig?.application?.manifestType;
      const appName = nocalhostConfig?.application?.name;
      if (
        [AppType.helmGit, AppType.kustomizeGit, AppType.rawManifestGit].indexOf(
          manifestType
        ) === -1
      ) {
        vscode.window.showErrorMessage(
          `Please choose another installation method`
        );
        return;
      }
      if (manifestType === AppType.helmGit) {
        await installHelmApp({
          kubeConfigPath: appNode.getKubeConfigPath(),
          namespace: appNode?.info?.namespace,
          gitUrl: gitUrl,
          configPath,
          resourcePath: nocalhostConfig?.application?.resourcePath,
          gitRef,
          installType: manifestType,
          appName,
        });
      }

      if (manifestType === AppType.rawManifestGit) {
        await installRawManifastLocal({
          kubeConfigPath: appNode.getKubeConfigPath(),
          namespace: appNode?.info?.namespace,
          gitUrl: gitUrl,
          resourcePath: nocalhostConfig?.application?.resourcePath,
          gitRef,
          installType: manifestType,
          configPath,
          appName,
        });
      }
      if (manifestType === AppType.kustomizeGit) {
        await installKustomizeApp({
          kubeConfigPath: appNode.getKubeConfigPath(),
          namespace: appNode?.info?.namespace,
          gitUrl: gitUrl,
          resourcePath: nocalhostConfig?.application?.resourcePath,
          gitRef,
          installType: manifestType,
          appName,
        });
      }
    }
    await appNode.updateData();
    await vscode.commands.executeCommand("Nocalhost.refresh", appNode);
  }
}
