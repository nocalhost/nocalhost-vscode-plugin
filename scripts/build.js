const { spawn } = require("child_process");
const path = require("path");
const iconv = require("iconv-lite");
const fs = require("fs");
const fe = require("fs-extra");

let argv = process.argv.slice(2);

process.env.NODE_ENV = getArg("env") ?? "development";

/**
 *
 * @param {String} str
 */
function getArg(str) {
  const name = `--${str}=`;
  let index = argv.findIndex((str) => str.startsWith(name));
  if (index > -1) {
    return argv.splice(index, 1)[0].replace(name, "");
  }
}
/**
 *
 * @param {Array} args
 */
function getBuildArgs(args) {
  args.push(
    "--outdir=dist",
    "--bundle",
    `--define:process.env.NODE_ENV=\\"${process.env.NODE_ENV}\\"`,
    ...argv
  );

  if (process.env.NODE_ENV === "development") {
    args.push("--sourcemap", "--watch");
  } else {
    args.push("--minify");
  }

  return args;
}
/**
 *
 * @param {Array} args
 */
function startBuild(args) {
  const proc = spawn(
    path.resolve("./node_modules/.bin/esbuild"),
    getBuildArgs(args),
    {
      shell: true,
    }
  );

  proc.stdout.on("data", (data) => {
    process.stdout.write(data);
  });
  proc.stderr.on("data", (data) => {
    process.stderr.write(data);
  });
}

function extension() {
  startBuild([
    "src/main/extension.ts",
    "--external:vscode",
    "--format=cjs",
    "--platform=node",
    "--target=node14",
  ]);
}

function html() {
  fs.createReadStream("src/renderer/assets/fonts/DroidSansMono_v1.ttf").pipe(
    fs.createWriteStream("dist/DroidSansMono_v1.ttf")
  );

  startBuild([
    "atom-one-light=src/renderer/assets/css/atom-one-light.css",
    "vs2015=src/renderer/assets/css/vs2015.css",
    "renderer_v1=src/renderer/index.tsx",
    "home=src/renderer/HomeIndex.tsx",
    "--format=esm",
    "--splitting",
    "--target=chrome89",
  ]);
}

fe.rmSync("dist", { recursive: true, force: true });
fe.mkdirSync("dist");

extension();
html();
