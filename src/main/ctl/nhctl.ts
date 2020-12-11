import { execAsync, execChildProcessAsync } from "./shell";
import { Host } from "../host";
import { spawn } from "child_process";

export function install(
  host: Host,
  kubeconfigPath: string,
  appName: string,
  gitUrl: string,
  installType: string,
  resourceDir: Array<string>,
  values?: string
) {
  let resourcePath = "";
  resourceDir.map((dir) => {
    resourcePath += ` --resource-path ${dir}`;
  });
  let installCommand = nhctlCommand(
    kubeconfigPath,
    `install ${appName} -u ${gitUrl} -t ${installType} ${
      values ? "-f " + values : ""
    } ${resourcePath}`
  );

  if (installType === "helm-repo") {
    installCommand = nhctlCommand(
      kubeconfigPath,
      `install ${appName} --helm-chart-name ${appName} -t ${installType} --helm-repo-url ${gitUrl}`
    );
  }

  host.log(`[cmd] ${installCommand}`, true);

  return new Promise((resolve, reject) => {
    const proc = spawn(installCommand, [], { shell: true });
    let errorStr = "";
    proc.on("close", (code) => {
      if (code === 0) {
        resolve(null);
      } else {
        reject(errorStr);
      }
    });

    proc.stdout.on("data", function (data) {
      host.log("" + data, true);
    });

    proc.stderr.on("data", function (data) {
      errorStr = data + "";
      host.log("" + data, true);
    });
  });
}

export async function uninstall(
  host: Host,
  kubeconfigPath: string,
  appName: string
) {
  const uninstallCommand = nhctlCommand(
    kubeconfigPath,
    `uninstall ${appName} --force`
  );
  host.log(`[cmd] ${uninstallCommand}`, true);
  await execChildProcessAsync(host, uninstallCommand, []);
}

export async function devStart(
  host: Host,
  kubeconfigPath: string,
  appName: string,
  workLoadName: string,
  syncs?: Array<string>
) {
  let syncOptions = "";
  if (syncs && syncs.length > 0) {
    syncOptions = syncs.join(" -s ");
    syncOptions = "-s " + syncOptions;
  }
  const devStartCommand = nhctlCommand(
    kubeconfigPath,
    `dev start ${appName} -d ${workLoadName} ${syncOptions}`
  );
  host.log(`[cmd] ${devStartCommand}`, true);
  await execChildProcessAsync(host, devStartCommand, []);
}

export async function startPortForward(
  host: Host,
  kubeconfigPath: string,
  appName: string,
  workloadName: string,
  ports?: Array<string>
) {
  let portOptions = "";
  if (ports && ports.length > 0) {
    portOptions = ports.join(" -p ");
    portOptions = "-p " + portOptions;
  }
  const portForwardCommand = nhctlCommand(
    kubeconfigPath,
    `port-forward ${appName} -d ${workloadName} ${portOptions}`
  );

  host.log(`[cmd] ${portForwardCommand}`, true);

  await execChildProcessAsync(host, portForwardCommand, []);
}

export async function syncFile(
  host: Host,
  kubeconfigPath: string,
  appName: string,
  workloadName: string
) {
  const syncFileCommand = nhctlCommand(
    kubeconfigPath,
    `sync ${appName} -d ${workloadName}`
  );
  host.log(`[cmd] ${syncFileCommand}`, true);
  await execChildProcessAsync(host, syncFileCommand, []);
}

export async function endDevMode(
  host: Host,
  kubeconfigPath: string,
  appName: string,
  workLoadName: string
) {
  const end = nhctlCommand(
    kubeconfigPath,
    `dev end ${appName} -d ${workLoadName} `
  );
  host.log(`[cmd] ${end}`, true);
  host.disposeDebug();
  await execChildProcessAsync(host, end, []);
}

export async function loadResource(host: Host, appName: string) {
  const describeCommand = `nhctl describe ${appName}`;
  // host.log(`[cmd] ${describeCommand}`, true);
  const result = await execAsync(describeCommand, []);
  return result.stdout;
}

export async function getAppInfo(appName: string) {
  const describeCommand = `nhctl plugin get ${appName}`;
  const result = await execAsync(describeCommand, []);
  return result.stdout;
}

export async function getServiceConfig(appName: string, workloadName: string) {
  const describeCommand = `nhctl plugin get ${appName} -d ${workloadName}`;
  const result = await execAsync(describeCommand, []);
  return result.stdout;
}

export async function printAppInfo(
  host: Host,
  kubeconfigPath: string,
  appName: string
) {
  const printAppCommand = nhctlCommand(kubeconfigPath, `list ${appName}`);
  host.log(`[cmd] ${printAppCommand}`, true);
  await execChildProcessAsync(host, printAppCommand, []);
}

export async function getConfig(appName: string, workloadName?: string) {
  const configCommand = `nhctl config get ${appName} ${
    workloadName ? `-d ${workloadName}` : ""
  }`;
  const result = await execAsync(configCommand, []);
  return result.stdout;
}

export async function editConfig(
  appName: string,
  workloadName: string | undefined | null,
  contents: string
) {
  const configCommand = `nhctl config edit ${appName} ${
    workloadName ? `-d ${workloadName}` : ""
  } -c ${contents}`;
  const result = await execAsync(configCommand, []);
  return result.stdout;
}

export async function getTemplateConfig(appName: string, workloadName: string) {
  const configCommand = `nhctl config template ${appName} -d ${workloadName}`;
  const result = await execAsync(configCommand, []);
  return result.stdout;
}

export function terminalCommand(appName: string, workloadName: string) {
  return `nhctl dev terminal ${appName} -d ${workloadName}`;
}

function nhctlCommand(kubeconfigPath: string, baseCommand: string) {
  return `nhctl ${baseCommand} --kubeconfig ${kubeconfigPath}`;
}
