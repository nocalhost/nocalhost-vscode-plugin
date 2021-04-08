export abstract class IDebugProvider {
  abstract startDebug(
    workspaceFolder: string,
    sessionName: string,
    port: number,
    workDir: string,
    terminatedCallback?: () => any
  ): Promise<boolean>;
}
