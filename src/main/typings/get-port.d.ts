declare module "get-port" {
  type Options = {
    port?: number | ReadonlyArray<number>;
    host?: string;
  };
  type GetPortFn = (options?: Options) => Promise<number>;
  type GetPortExport = GetPortFn;
  const GetPort: GetPortExport;
  export = GetPort;
}
