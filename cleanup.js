const fs = require("fs");
const rimraf = require("rimraf");
const path = require("path");
const os = require("os");

const homeDir = os.homedir();
const nhDir = path.resolve(homeDir, ".nh");
const pluginPath = path.resolve(nhDir, "plugin");

function destroy() {
  const isExist = fs.existsSync(pluginPath);
  if (isExist) {
    rimraf.sync(pluginPath);
  }
}

destroy();
