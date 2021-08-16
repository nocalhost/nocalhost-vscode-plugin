import { spawnSync } from "child_process";
import host from "../host";
import logger from "../utils/logger";
import { NhctlCommand } from "./../ctl/nhctl";

export abstract class IDebugProvider {
  static requiredCommand = ["ps", "awk", "netstat"];
  abstract startDebug(
    workspaceFolder: string,
    sessionName: string,
    port: number,
    workDir: string,
    terminatedCallback?: () => any
  ): Promise<boolean>;

  public killContainerDebugProcess(
    podName: string,
    kubeconfigPath: string,
    execCommand: string[],
    namespace: string
  ) {
    const command = `k exec ${podName} -c nocalhost-dev --kubeconfig ${kubeconfigPath} -n ${namespace} --`;
    const args = command.split(" ");
    const sliceCommands = execCommand.join(" ").split("&&");

    const killCommand = `kill -9 \`ps aux|grep -i '${sliceCommands[
      sliceCommands.length - 1
    ].trim()}'|grep -v grep|awk '{print $2}'\``;

    args.push("bash", "-c", `${killCommand}`);
    const cmd = `${NhctlCommand.nhctlPath} ${args.join(" ")}`;
    host.log(`[debug] ${cmd}`, true);
    logger.error(`[cmd]: ${cmd}`);
    spawnSync(NhctlCommand.nhctlPath, args);
  }

  public async isDebuggerInstalled() {
    return Promise.resolve(true);
  }

  public checkRequiredCommand(
    podName: string,
    namespace: string,
    kubeconfigPath: string
  ) {
    function check(requiredCommand: string) {
      const command = `k exec ${podName} -c nocalhost-dev --kubeconfig ${kubeconfigPath} -n ${namespace}  --`;
      const args = command.split(" ");

      args.push(`which ${requiredCommand}`);
      host.log(`[cmd]：${NhctlCommand.nhctlPath} ${args.join(" ")}`, true);

      const result = spawnSync(NhctlCommand.nhctlPath, args);
      if (`${result.stdout}`) {
        return true;
      }
      return false;
    }
    const notFound: Array<string> = [];
    IDebugProvider.requiredCommand.forEach((c) => {
      const r = check(c);
      if (!r) {
        notFound.push(c);
      }
    });
    return notFound;
  }
}
