const path = require("path");
const fs = require("fs");

const tablesPath = path.join(
  __dirname,
  "../node_modules/iconv-lite/encodings/tables"
);

const files = fs.readdirSync(tablesPath);

files.forEach((file) => {
  if (file !== "cp936.json") {
    fs.writeFileSync(path.join(tablesPath, file), "[]");
  }
});
