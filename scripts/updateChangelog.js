const https = require("https");
const fs = require("fs");
const path = require("path");

let updateURL =
  "https://raw.githubusercontent.com/nocalhost/nocalhost/main/CHANGELOG/CHANGELOG-v0.4.9.md";
const CHANGELOG_PATH = path.resolve(__dirname, "../CHANGELOG.md");

function readUpdateFile() {
  https.get(updateURL, function (res) {
    res.setEncoding("utf-8");
    let data = "";
    res.on("data", function (chunk) {
      data += chunk;
    });
    res.on("end", function () {
      let regex = /\*\*VSCode Plugin\*\*([\w\W]*?)\*\*nhctl\*\*/;
      const header = `# Change Log`;
      const result = data.match(regex)[1];
      // const buf = Buffer.from(result);
      // fs.appendFileSync(CHANGELOG_PATH, buf);
      let file = fs.readFileSync(CHANGELOG_PATH).toString().replace(/# Change Log/, '');
      const buf = Buffer.from(header + result + file);
      fs.writeFileSync(CHANGELOG_PATH, buf);
    });
  });
}

readUpdateFile();
