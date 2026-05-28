const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const distRoot = path.join(root, "dist");
const vitepressOutDir = path.join(distRoot, "learn");
const vitepressCli = require.resolve("vitepress/dist/node/cli.js");

const copyTargets = [
  "index.html",
  "articles.html",
  "reader.html",
  "contribute.html",
  "CNAME",
  "assets",
  "data"
];

const run = (command, args) => {
  execFileSync(command, args, {
    cwd: root,
    stdio: "inherit"
  });
};

const copyEntry = (name) => {
  const source = path.join(root, name);
  const target = path.join(distRoot, name);

  if (!fs.existsSync(source)) {
    return;
  }

  fs.cpSync(source, target, {
    recursive: true
  });
};

fs.rmSync(distRoot, { recursive: true, force: true });
run(process.execPath, [vitepressCli, "build", "docs"]);

fs.mkdirSync(vitepressOutDir, { recursive: true });

copyTargets.forEach(copyEntry);

console.log(`Built combined site into ${path.relative(root, distRoot)}.`);
