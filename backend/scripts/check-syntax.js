const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const targetDirectories = [path.join(rootDir, "src"), path.join(rootDir, "scripts")];

const files = targetDirectories.flatMap((directory) => walk(directory)).filter((filePath) =>
  filePath.endsWith(".js")
);

const failures = [];

files.forEach((filePath) => {
  const result = spawnSync(process.execPath, ["--check", filePath], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    failures.push(result.stderr || result.stdout || `Syntax check failed for ${filePath}`);
  }
});

if (failures.length) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exit(1);
}

process.stdout.write(`Syntax check passed for ${files.length} files.\n`);

function walk(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (["node_modules", "coverage", ".venv-biometric", "__pycache__"].includes(entry.name)) {
        return [];
      }

      return walk(absolutePath);
    }

    return [absolutePath];
  });
}
