const http = require("http");
const {
  downloadAndUnzipVSCode,
  resolveCliPathFromVSCodeExecutablePath,
} = require("vscode-test");
const getPort = require("get-port");
const cp = require("child_process");
const path = require("path");

/**
 *
 * @param {object} options
 * @param {string?} options.vscodeExecutablePath
 * @param {string?} options.version
 * @param {string?} options.platform
 * @param {object?} options.testsEnv
 */
const start = async (options = {}) => {
  if (!options.vscodeExecutablePath) {
    options.vscodeExecutablePath = await downloadAndUnzipVSCode(
      options.version,
      options.platform
    );

    const cliPath = resolveCliPathFromVSCodeExecutablePath(
      options.vscodeExecutablePath
    );

    const extensionPath = path.join(__dirname, "../../nocalhost.vsix");

    const spawnSyncReturns = cp.spawnSync(
      cliPath,
      ["--install-extension", extensionPath],
      {
        encoding: "utf-8",
        stdio: "inherit",
      }
    );

    if (spawnSyncReturns.status !== 0) {
      throw new Error("install-extension error");
    }
  }

  const port = await getPort();

  console.warn("port", port);

  let args = [
    // https://github.com/microsoft/vscode/issues/84238
    "--no-sandbox",
    "--disable-workspace-trust",
    `--remote-debugging-port=${port}`,
  ];

  if (options.launchArgs) {
    args = options.launchArgs.concat(args);
  }
  const pid = await run(options.vscodeExecutablePath, args, options.testsEnv);

  return { pid, port };
};

/**
 *
 * @param {object} testsEnv
 * @param {string} executable
 * @param {string []} args
 * @returns
 */
const run = async (executable, args, testsEnv) => {
  const fullEnv = Object.assign({}, process.env, testsEnv);
  const cmd = cp.spawn(executable, args, { env: fullEnv });

  cmd.stdout.on("data", function (data) {
    console.log(data.toString());
  });

  cmd.stderr.on("data", function (data) {
    console.error(data.toString());
  });

  cmd.on("error", function (data) {
    console.error("Test error: " + data.toString());
  });

  let finished = false;
  function onProcessClosed(code, signal) {
    if (finished) {
      return;
    }
    finished = true;
    console.log(`Exit code:   ${code ?? signal}`);

    if (code === null) {
      reject(signal);
    } else if (code !== 0) {
      reject("Failed");
    }

    console.log("Done\n");
  }

  cmd.on("close", onProcessClosed);

  cmd.on("exit", onProcessClosed);

  const { pid } = cmd;

  console.warn("pid", pid);

  return pid;
};

const getWebSocketDebuggerUrl = async (port) =>
  new Promise((resolve, reject) => {
    let json = "";
    const request = http.request(
      {
        host: "127.0.0.1",
        path: "/json/version",
        port,
      },
      (response) => {
        response.on("error", reject);
        response.on("data", (chunk) => {
          json += chunk.toString();
        });
        response.on("end", () =>
          resolve(JSON.parse(json).webSocketDebuggerUrl)
        );
      }
    );
    request.on("error", reject);
    request.end();
  });

module.exports = {
  start,
  getWebSocketDebuggerUrl,
};
