
const fs = require("fs");
const path = require("path");
const shelljs =require('shelljs');

const packageJsonUri = path.resolve(__dirname, "../package.json");
const packageJson = JSON.parse(
  fs.readFileSync(packageJsonUri, { encoding: "utf8" })
);

const gitVer =shelljs.exec("git rev-list --all --count").stdout.replace('\n',"");

const version=`-beta.${gitVer}`;

packageJson.version += version;

fs.unlinkSync(packageJsonUri);
fs.writeFileSync(packageJsonUri, JSON.stringify(packageJson));