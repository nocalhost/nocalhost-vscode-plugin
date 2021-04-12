import { spawnSync } from "child_process";

export abstract class IDebugProvider {
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
    execCommand: string[]
  ) {
    const command = `exec ${podName} -c nocalhost-dev --kubeconfig ${kubeconfigPath} --`;
    const args = command.split(" ");
    const sliceCommands = execCommand.join(" ").split("&&");

    const killCommand = `kill -9 \`ps aux|grep -i '${sliceCommands[
      sliceCommands.length - 1
    ].trim()}'|grep -v grep|awk '{print $2}'\``;

    args.push("bash", "-c", `${killCommand}`);
    spawnSync(`kubectl`, args);
  }

  public async isDebuggerInstalled() {
    return Promise.resolve(true);
  }
}
