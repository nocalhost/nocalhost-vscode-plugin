const fs = require("fs");
const path = require("path");

let version = process.env.VERSION || "v0.6.2";

console.log("> update changelog version to: ", version);

const matched = version.match(/\d+\.\d+\.\d+/);
if (!matched || matched.length !== 1) {
  return;
}

version = matched[0];

const CHANGELOG_PATH = path.resolve(__dirname, "../CHANGELOG.md");
const currentVersion = version.replace(/(\d\.\d\.)(\d)/, "$1x");
function readUpdateFile() {
  const buf = Buffer.from(
    `# Change Log\n[https://nocalhost.dev/docs/changelogs/${currentVersion}](https://nocalhost.dev/docs/changelogs/${currentVersion})`
  );
  fs.writeFileSync(CHANGELOG_PATH, buf);
}

readUpdateFile();
