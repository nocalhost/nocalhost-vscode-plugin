const cp = require("child_process");
const path = require("path");
const fse = require("fs-extra");
const assert = require("assert");
const isWindows = require("is-windows");
const os = require("os");
const getPort = require("get-port");
const axios = require("axios");
const { getRepository, gitCode } = require("./lib");

const {
  downloadAndUnzipVSCode,
  resolveCliArgsFromVSCodeExecutablePath,
} = require("@vscode/test-electron");

const logger = require("./lib/log");
const VideoCapture = require("./lib/videoCapture");

const videoCapture = new VideoCapture();

/**
 *
 * @param {object} options
 * @param {string?} options.vscodeExecutablePath
 * @param {string?} options.version
 * @param {string?} options.platform
 * @param {object?} options.testsEnv
 * @returns {{pid:string,port:string}}
 */
const start = async (options = {}) => {
  const userDataDir = await getUserDataDir();

  if (!options.vscodeExecutablePath) {
    options.vscodeExecutablePath = await downloadAndUnzipVSCode(
      options.version,
      options.platform
    );
  }

  const [cliPath] = resolveCliArgsFromVSCodeExecutablePath(
    options.vscodeExecutablePath
  );

  const syncReturns = cp.spawnSync(
    cliPath,
    [
      "--extensions-dir",
      getExtensionsDir(true),
      "--install-extension",
      path.join(__dirname, "../../nocalhost.vsix"),
    ],
    {
      encoding: "utf-8",
      stdio: "inherit",
    }
  );

  assert.strictEqual(
    0,
    syncReturns.status,
    "install-extension error :" + JSON.stringify(syncReturns)
  );

  const port = await getPort();

  logger.debug("port", port);

  logger.debug("useDataDir", userDataDir);

  let args = [
    // https://github.com/microsoft/vscode/issues/84238
    "--no-sandbox",
    "--disable-workspace-trust",
    "--disable-dev-shm-usage",

    "--disable-web-security",
    "--disable-features=IsolateOrigins",
    "--disable-site-isolation-trials",
    // "--disable-extensions",
    `--extensions-dir=${getExtensionsDir()}`,
    `--user-data-dir=${userDataDir}`,
    `--remote-debugging-port=${port}`,
  ];

  if (options.launchArgs) {
    args = options.launchArgs.concat(args);
  }

  // process.env.currentPath = (
  //   await gitCode(getRepository("bookinfo-ratings.git"))
  // ).tmpDir;
  // args.unshift(process.env.currentPath);

  const pid = await run(options.vscodeExecutablePath, args, options.testsEnv);

  return { pid, port };
};

const getExtensionsDir = (isInit = false) => {
  let extensionsDir = path.join(__dirname, "../../.vscode-test/extensions");

  if (isWindows()) {
    extensionsDir = path.join(
      os.tmpdir(),
      process.pid.toString(),
      ".vscode-test/extensions"
    );
  }

  if (isInit) {
    if (fse.existsSync(extensionsDir)) {
      fse.removeSync(extensionsDir);
    }

    fse.mkdirpSync(extensionsDir);
  }

  return extensionsDir;
};
const getUserDataDir = async () => {
  let userDataDir = path.join(__dirname, "../../.vscode-test/user-data");

  if (isWindows()) {
    userDataDir = path.join(
      os.tmpdir(),
      process.pid.toString(),
      ".vscode-test/user-data"
    );
  }

  if (fse.existsSync(userDataDir)) {
    fse.removeSync(userDataDir);
  }

  await fse.copy(path.join(__dirname, "./config/vscode"), userDataDir);

  // copy test config file
  await fse.copy(
    path.join(__dirname, "./config/yaml"),
    path.join(os.tmpdir(), "./config/yaml")
  );
  return userDataDir;
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
    logger.info(data.toString());
  });

  cmd.stderr.on("data", function (data) {
    logger.warn(data.toString());
  });

  cmd.on("error", function (data) {
    logger.error("Test error: " + data.toString());
  });

  let finished = false;
  function onProcessClosed(code, signal) {
    if (finished) {
      return;
    }
    finished = true;
    logger.info(`Exit code:   ${code ?? signal}`);

    if (code === null) {
      logger.debug(signal);
    } else if (code !== 0) {
      logger.error("Failed");
    }

    logger.info("Done\n");
  }

  cmd.on("close", onProcessClosed);

  cmd.on("exit", onProcessClosed);

  const { pid } = cmd;

  logger.debug("pid", pid);

  return pid;
};

const getWebSocketDebuggerUrl = async (port) => {
  return axios.default
    .get(`http://127.0.0.1:${port}/json/version`)
    .then((json) => {
      return json.data.webSocketDebuggerUrl;
    })
    .catch((err) => {
      logger.err("getWebSocketDebuggerUrl", port);
      throw err;
    });
};

module.exports = {
  start,
  getWebSocketDebuggerUrl,
  videoCapture,
};

(async () => {
  if (require.main === module) {
    await start();
  }
})();
