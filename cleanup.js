const fs = require("fs");
const path = require("path");
const os = require("os");

const homeDir = os.homedir();
const nhDir = path.resolve(homeDir, ".nh");
const configPath = path.resolve(nhDir, "plugin/config.json");

function destroyConfig() {
  const isExist = fs.existsSync(configPath);
  if (isExist) {
    fs.unlinkSync(configPath);
  }
}

destroyConfig();
