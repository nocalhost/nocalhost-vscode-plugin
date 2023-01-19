const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const fe = require("fs-extra");

const {
  promises: { readdir },
} = fs;

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
async function startBuild(name, args) {
  const proc = spawn(
    path.resolve("./node_modules/.bin/esbuild"),
    getBuildArgs(args),
    {
      shell: true,
    }
  );

  proc.stdout.on("data", (data) => {
    process.stdout.write(`[${name}] ${data}`);
  });
  proc.stderr.on("data", (data) => {
    process.stderr.write(`[${name}] ${data}`);
  });

  return new Promise((res) => {
    proc.on("exit", res);
  });
}

function extension() {
  startBuild("extension", [
    "src/main/extension.ts",
    "--external:vscode",
    "--format=cjs",
    "--platform=node",
    "--target=node14",
  ]);
}
/**
 *
 * @param {string} source
 * @returns {Promise<string[]>}
 */
async function getEntryArray(source) {
  const array = (await readdir(source, { withFileTypes: true })).map(
    async (dirent) => {
      const { name } = dirent;
      const filePath = path.join(source, name);

      if (!dirent.isDirectory()) {
        return filePath;
      }

      return await getEntryArray(filePath);
    }
  );

  return (await Promise.all(array)).flat(1);
}
const fontPath = "static/app/DroidSansMono_v1.ttf";
async function assets() {
  const entryArray = (await getEntryArray("static")).map((file) => {
    if (file.endsWith(".css")) {
      return `${file.replace(".css", "")}=${file}`;
    }
    return "";
  });
  // build like `npx esbuild --target=chrome89 --outdir=dist --bundle --sourcemap` will block the process of build
  if (entryArray.length > 0) {
    await startBuild("css", [...entryArray, "--target=chrome89"]);
  }
  // pre check fontPath
  if(fs.existsSync(fontPath)) {
    fs.createReadStream(fontPath).pipe(
      fs.createWriteStream(`dist/${fontPath}`)
    );
  }
}

async function html() {
  startBuild("html", [
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

assets();

html();
