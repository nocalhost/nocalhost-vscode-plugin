import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import html from "@rollup/plugin-html";
import replace from "@rollup/plugin-replace";
import livereload from "rollup-plugin-livereload";
import { terser } from "rollup-plugin-terser";
import typescript from "rollup-plugin-typescript2";

const env = process.env.NODE_ENV || "development";
const isDev = env === "development";

const baseUrl = {
  development: "",
  production: "",
}[env];
const destDir = "static/renderer";

console.log(`> env: ${env}`);

const serve = (options) => {
  let server;
  const { dir, port } = options;
  const exit = () => {
    if (server) server.kill(0);
  };
  if (!dir || !port) return;
  return {
    writeBundle() {
      if (server) return;
      server = require("child_process").spawn(
        "npx",
        ["sirv", dir, "--port " + port, "--dev"],
        {
          stdio: ["ignore", "inherit", "inherit"],
          shell: true,
        }
      );
      process.on("SIGTERM", exit);
      process.on("exit", exit);
    },
  };
};

export default {
  input: "src/renderer/index.tsx",
  output: {
    sourcemap: true,
    format: "iife",
    name: "app",
    file: `${destDir}/bundle.js`,
  },
  plugins: [
    replace({
      __BASE_URL__: baseUrl,
      "process.env.NODE_ENV": JSON.stringify(env),
    }),
    resolve(),
    commonjs(),
    typescript({
      tsconfig: "tsconfig.renderer.json",
    }),
    html({
      template() {
        return `
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <title>Nocalhost Renderer</title>
              <meta charset="utf-8" />
            </head>
            <body>
              <div id="root"></div>
              <script src="bundle.js"></script>
            </body>
          </html>
        `;
      },
    }),
    isDev && serve({ dir: `${destDir}`, port: 3001 }),
    isDev && livereload(`${destDir}`),
    !isDev && terser(),
  ],
  watch: {
    clearScreen: false,
  },
};
