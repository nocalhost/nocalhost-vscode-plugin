const https = require("https");
const fs = require("fs");
const path = require("path");

let version = process.env.VERSION || '0.5.1';
console.log("> update changelog version to: ", version);

let updateURL = `https://raw.githubusercontent.com/nocalhost/nocalhost.github.io/main/docs/changelogs/${version.replace(
  /(\d\.\d\.)(\d)/,
  "$1x"
)}.md`;
const CHANGELOG_PATH = path.resolve(__dirname, "../CHANGELOG.md");

function readUpdateFile() {
  https.get(updateURL, function (res) {
    res.setEncoding("utf-8");
    let data = "";
    res.on("data", function (chunk) {
      data += chunk;
    });
    res.on("end", function () {
      const header = `# Change Log`;

      const header2 = data.match(/##\s.*?\)/)[0];
      console.log(header2);

      let regex = /###\sVS\sCode([\w\W]*?)###\sJetBrains/;
      const result = data.match(regex)[1];
      // console.log(result);

      let file = fs
        .readFileSync(CHANGELOG_PATH)
        .toString()
        .replace(/# Change Log/, "");

        console.log(file);

      if (file.indexOf(header2) === -1) {
        const buf = Buffer.from(`${header}\n${header2}${result}${file}`);
        fs.writeFileSync(CHANGELOG_PATH, buf);
      }
      
    });
  });
}

readUpdateFile();
